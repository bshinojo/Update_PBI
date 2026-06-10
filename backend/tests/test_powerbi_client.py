# Tests del PowerBIClient con httpx mockeado (sin credenciales ni red). Cubren el
# fallback a la Scanner API para modelos con RLS: DAX da 401 -> se escanea -> se listan
# las tablas; y que el camino DAX normal no escanea, que el scan se cachea, y que si el
# fallback está apagado se levanta el error claro.
import time

import httpx
import pytest

from app.config import Settings
from app.datasource import TablesUnavailableError
from app.powerbi.client import PowerBIClient

_SCAN_RESULT = {
    "workspaces": [
        {
            "id": "ws1",
            "datasets": [
                {
                    "id": "ds-rls",
                    "name": "Modelo con RLS",
                    "tables": [
                        {"name": "Ventas"},
                        {"name": "Clientes"},
                        {"name": "LocalDateTable_9f3"},  # auto date table -> se filtra
                    ],
                }
            ],
        }
    ]
}


def _client(handler, **overrides) -> PowerBIClient:
    settings = Settings(tenant_id="t", client_id="c", client_secret="s", **overrides)
    c = PowerBIClient(settings)
    # Saltamos el fetch real del token y enchufamos un transporte mockeado.
    c._token = "tok"
    c._token_exp = time.time() + 3600
    c._client = httpx.Client(transport=httpx.MockTransport(handler))
    return c


def _scanner_handler(request: httpx.Request) -> httpx.Response:
    p = request.url.path
    if p.endswith("/executeQueries"):  # DAX rechazado por RLS
        return httpx.Response(401, json={"error": {"code": "PowerBINotAuthorizedException"}})
    if p.endswith("/groups"):
        return httpx.Response(200, json={"value": [{"id": "ws1", "name": "WS 1"}]})
    if p.endswith("/admin/workspaces/getInfo"):
        return httpx.Response(202, json={"id": "scan1"})
    if "/scanStatus/" in p:
        return httpx.Response(200, json={"status": "Succeeded"})
    if "/scanResult/" in p:
        return httpx.Response(200, json=_SCAN_RESULT)
    return httpx.Response(404, json={})


def test_rls_falls_back_to_scanner_and_filters_date_tables():
    c = _client(_scanner_handler)
    names = [t.name for t in c.list_tables("ds-rls")]
    assert names == ["Ventas", "Clientes"]  # la LocalDateTable_* queda fuera


def test_dax_path_does_not_scan():
    calls = {"scan": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        p = request.url.path
        if p.endswith("/executeQueries"):
            return httpx.Response(200, json={"results": [{"tables": [{"rows": [
                {"[Name]": "A"}, {"[Name]": "B"}]}]}]})
        if p.endswith("/admin/workspaces/getInfo"):
            calls["scan"] += 1
            return httpx.Response(202, json={"id": "x"})
        return httpx.Response(404, json={})

    c = _client(handler)
    assert [t.name for t in c.list_tables("ds-ok")] == ["A", "B"]
    assert calls["scan"] == 0  # si DAX anda, no se escanea


def test_scan_result_is_cached():
    calls = {"scan": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/admin/workspaces/getInfo"):
            calls["scan"] += 1
        return _scanner_handler(request)

    c = _client(handler)
    c.list_tables("ds-rls")
    c.list_tables("ds-rls")
    assert calls["scan"] == 1  # el segundo request usa la cache


def test_scanner_disabled_raises_clear_error():
    c = _client(_scanner_handler, scanner_enabled=False)
    with pytest.raises(TablesUnavailableError):
        c.list_tables("ds-rls")


def test_get_refresh_detail_extracts_error_messages():
    # Enhanced refresh fallido: el motivo sale de `messages` (solo los type=Error).
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={
            "status": "Failed",
            "messages": [
                {"message": "aviso benigno", "type": "Warning"},
                {"message": "La credencial expiró", "type": "Error"},
            ],
        })

    c = _client(handler)
    status, error = c.get_refresh_detail("ds-1", "r1", group_id="ws-1")
    assert status == "Failed" and error == "La credencial expiró"


def test_get_refresh_detail_falls_back_to_service_exception():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={
            "status": "Failed",
            "serviceExceptionJson": '{"errorCode":"ModelRefreshFailed"}',
        })

    c = _client(handler)
    status, error = c.get_refresh_detail("ds-1", "r1")
    assert status == "Failed" and "ModelRefreshFailed" in error


def test_get_refresh_detail_no_error_when_clean():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"status": "Completed"})

    c = _client(handler)
    assert c.get_refresh_detail("ds-1", "r1") == ("Completed", None)


def test_scanner_unavailable_raises_clear_error():
    # getInfo devuelve 401 (el tenant no habilitó las admin APIs para el SP) -> error claro.
    def handler(request: httpx.Request) -> httpx.Response:
        p = request.url.path
        if p.endswith("/executeQueries"):
            return httpx.Response(401, json={"error": {"code": "PowerBINotAuthorizedException"}})
        if p.endswith("/groups"):
            return httpx.Response(200, json={"value": [{"id": "ws1", "name": "WS 1"}]})
        if p.endswith("/admin/workspaces/getInfo"):
            return httpx.Response(401, json={"error": {"code": "PowerBINotAuthorizedException"}})
        return httpx.Response(404, json={})

    c = _client(handler)
    with pytest.raises(TablesUnavailableError):
        c.list_tables("ds-rls")
