# Cliente de la REST API de Power BI. Autentica con el flujo client-credentials
# (service principal) y cachea el token hasta poco antes de que expire. Las
# lecturas (workspaces/datasets/tablas vía XMLA) y el enhanced refresh selectivo
# están verificados contra un tenant real (ver CLAUDE.md).
import logging
import threading
import time
from typing import Any

import httpx

from ..config import Settings
from ..models import Dataset, TableInfo, Workspace

logger = logging.getLogger("pbi.powerbi")

# Mapeo de nuestro RefreshType al "type" del enhanced refresh de Power BI.
# Coincide 1:1 con los valores que acepta el servicio.
_REFRESH_TYPE_MAP = {"full": "full", "dataOnly": "dataOnly", "calculate": "calculate"}


def _is_real_table(name: str | None) -> bool:
    """Descarta las tablas de sistema auto-generadas (date tables ocultas). Mismo
    criterio para el camino DAX y el de la Scanner API, para que la lista quede igual."""
    return bool(
        name
        and not str(name).startswith("DateTableTemplate")
        and not str(name).startswith("LocalDateTable")
    )


_ERROR_TEXT_MAX = 300


def _extract_refresh_error(data: dict) -> str | None:
    """Motivo del fallo de un refresh, si la respuesta lo trae. Enhanced refresh
    informa `messages: [{message, type}]`; el historial clásico, `serviceExceptionJson`
    (un JSON serializado con errorCode/errorDescription). Devuelve un texto corto."""
    messages = data.get("messages")
    if isinstance(messages, list):
        errors = [
            str(m.get("message"))
            for m in messages
            if isinstance(m, dict) and m.get("message")
            and str(m.get("type", "")).lower() == "error"
        ]
        if errors:
            return ("; ".join(errors))[:_ERROR_TEXT_MAX]
    exc = data.get("serviceExceptionJson")
    if exc:
        return str(exc)[:_ERROR_TEXT_MAX]
    return None


class PowerBIError(Exception):
    """Falla al hablar con Power BI (auth o REST). `status_code`/`code` quedan
    disponibles (cuando la falla es un HTTP de la REST API) para que las capas de
    arriba puedan distinguir, p. ej., un 401 de RLS de otros errores."""

    def __init__(self, message: str, status_code: int | None = None, code: str | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code


class PowerBIClient:
    def __init__(self, settings: Settings, timeout: float = 30.0) -> None:
        missing = [
            name
            for name, val in (
                ("PBI_TENANT_ID", settings.tenant_id),
                ("PBI_CLIENT_ID", settings.client_id),
                ("PBI_CLIENT_SECRET", settings.client_secret),
            )
            if not val
        ]
        if missing:
            raise PowerBIError(
                "Faltan credenciales de Power BI: " + ", ".join(missing) +
                ". Completalas en backend/.env (ver .env.example)."
            )
        self._s = settings
        self._client = httpx.Client(timeout=timeout)
        self._token: str | None = None
        self._token_exp: float = 0.0
        # Cache del fallback por Scanner API: mapa {dataset_id -> [tablas]} de un scan
        # de todos los workspaces visibles, con vencimiento. El lock evita que dos
        # requests concurrentes disparen scans en paralelo.
        self._scan_lock = threading.Lock()
        self._scan_map: dict[str, list[str]] | None = None
        self._scan_exp: float = 0.0

    # --- Auth ---

    def _access_token(self) -> str:
        # Renovamos 60s antes de la expiración real para evitar carreras.
        if self._token and time.time() < self._token_exp - 60:
            return self._token
        url = f"{self._s.authority}/{self._s.tenant_id}/oauth2/v2.0/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": self._s.client_id,
            "client_secret": self._s.client_secret,
            "scope": self._s.scope,
        }
        try:
            res = self._client.post(url, data=data)
            res.raise_for_status()
        except httpx.HTTPError as e:
            raise PowerBIError(f"No se pudo obtener el token de Azure AD: {e}") from e
        payload = res.json()
        self._token = payload["access_token"]
        self._token_exp = time.time() + float(payload.get("expires_in", 3600))
        return self._token

    def _get(self, path: str) -> Any:
        return self._request("GET", path)

    def _send(self, method: str, path: str, json: Any = None, params: Any = None) -> httpx.Response:
        url = f"{self._s.api_base}{path}"
        headers = {"Authorization": f"Bearer {self._access_token()}"}
        try:
            res = self._client.request(method, url, headers=headers, json=json, params=params)
            res.raise_for_status()
        except httpx.HTTPStatusError as e:
            # La REST API respondió con un status de error: conservamos el código HTTP
            # y el "error code" de Power BI (p. ej. PowerBINotAuthorizedException) para
            # que las capas de arriba puedan reaccionar distinto según el caso.
            code = None
            try:
                code = e.response.json().get("error", {}).get("code")
            except Exception:
                pass
            raise PowerBIError(
                f"Error llamando a Power BI ({method} {path}): {e}",
                status_code=e.response.status_code,
                code=code,
            ) from e
        except httpx.HTTPError as e:
            raise PowerBIError(f"Error llamando a Power BI ({method} {path}): {e}") from e
        return res

    def _request(self, method: str, path: str, json: Any = None, params: Any = None) -> Any:
        res = self._send(method, path, json, params)
        if res.status_code == 204 or not res.content:
            return None
        return res.json()

    # --- Lecturas ---

    def list_workspaces(self) -> list[Workspace]:
        data = self._get("/groups")
        return [Workspace(id=g["id"], name=g["name"]) for g in data.get("value", [])]

    def list_datasets(self, workspace_id: str) -> list[Dataset]:
        data = self._get(f"/groups/{workspace_id}/datasets")
        return [
            Dataset(id=d["id"], name=d["name"], workspace_id=workspace_id)
            for d in data.get("value", [])
        ]

    def list_tables(self, dataset_id: str) -> list[TableInfo]:
        # No hay un endpoint REST directo para las tablas de un dataset de importación;
        # las pedimos vía DAX (INFO.VIEW.TABLES). Requiere XMLA/ejecución de consultas
        # habilitado en la capacidad.
        #
        # OJO: una falla de lectura NO es lo mismo que "el modelo no tiene tablas".
        # El caso más común es un modelo con seguridad a nivel de fila (RLS): Power BI
        # rechaza las consultas del service principal con 401 (PowerBINotAuthorizedException).
        # Antes devolvíamos [] y el front mostraba "este modelo no tiene tablas", lo cual
        # era engañoso. Ahora propagamos un TablesUnavailableError con un mensaje claro.
        from ..datasource import TablesUnavailableError

        body = {"queries": [{"query": "EVALUATE INFO.VIEW.TABLES()"}],
                "serializerSettings": {"includeNulls": True}}
        try:
            data = self._request("POST", f"/datasets/{dataset_id}/executeQueries", json=body)
        except PowerBIError as e:
            is_rls = e.status_code == 401 or e.code == "PowerBINotAuthorizedException"
            logger.warning(
                "DAX no pudo leer las tablas del dataset %s: HTTP %s code=%s%s",
                dataset_id, e.status_code, e.code,
                " (RLS: intento fallback por Scanner API)" if is_rls else "",
            )
            # Fallback para modelos con RLS: la Scanner API lee el esquema sin DAX.
            if is_rls and self._s.scanner_enabled:
                names = self._scanner_tables(dataset_id)
                if names is not None:
                    return [TableInfo(name=n, dataset_id=dataset_id) for n in names]
            if is_rls:
                raise TablesUnavailableError(
                    "No se pudieron leer las tablas de este modelo. Suele pasar cuando "
                    "el modelo tiene seguridad a nivel de fila (RLS) o cuando al service "
                    "principal le faltan permisos para ejecutar consultas sobre él. "
                    "Pedile al administrador de Power BI que habilite el acceso."
                ) from e
            raise TablesUnavailableError(
                "No se pudieron leer las tablas de este modelo (error al consultar Power BI)."
            ) from e
        rows = data["results"][0]["tables"][0]["rows"]
        names = []
        for row in rows:
            name = row.get("[Name]") or row.get("Name")
            if _is_real_table(name):
                names.append(str(name))
        return [TableInfo(name=n, dataset_id=dataset_id) for n in names]

    # --- Fallback por Scanner API (modelos con RLS) ---

    def _scanner_tables(self, dataset_id: str) -> list[str] | None:
        """Tablas de un dataset según la Scanner API (admin metadata, sin DAX → esquiva
        el RLS). Devuelve la lista, o None si el scan falló o el dataset no apareció
        (en cuyo caso list_tables levanta el error claro de siempre)."""
        mapping = self._scanner_table_map()
        if mapping is None:
            return None
        names = mapping.get(dataset_id)
        if names is None:
            logger.warning("Scanner API: el dataset %s no apareció en el scan.", dataset_id)
        return names

    def _scanner_table_map(self) -> dict[str, list[str]] | None:
        """Mapa {dataset_id -> [tablas]} de un scan de todos los workspaces visibles,
        cacheado por `scanner_cache_ttl_min`. None si la Scanner API no está disponible
        (p. ej. el tenant no habilitó las read-only admin APIs para el service principal)."""
        now = time.time()
        with self._scan_lock:
            if self._scan_map is not None and now < self._scan_exp:
                return self._scan_map
            try:
                ws_ids = [w.id for w in self.list_workspaces()]
                mapping = self._run_scan(ws_ids)
            except (PowerBIError, httpx.HTTPError, KeyError) as e:
                logger.warning("Scanner API no disponible: %s", e)
                return None
            self._scan_map = mapping
            self._scan_exp = now + self._s.scanner_cache_ttl_min * 60
            logger.info("Scanner API: scan OK, %s datasets cacheados.", len(mapping))
            return mapping

    def _run_scan(self, workspace_ids: list[str]) -> dict[str, list[str]]:
        """Ejecuta el flujo de la Scanner API (getInfo → poll scanStatus → scanResult)
        y arma el mapa {dataset_id -> [tablas]} con el esquema devuelto."""
        ids = workspace_ids[:100]  # getInfo admite hasta 100 workspaces por llamada.
        if len(workspace_ids) > 100:
            logger.warning("Scanner API: %s workspaces, se escanean los primeros 100.",
                           len(workspace_ids))
        params = {"datasetSchema": "true", "datasetExpressions": "false",
                  "lineage": "false", "datasourceDetails": "false", "getArtifactUsers": "false"}
        started = self._request("POST", "/admin/workspaces/getInfo",
                                json={"workspaces": ids}, params=params)
        scan_id = started["id"]
        deadline = time.time() + self._s.scanner_poll_timeout_sec
        status = None
        while time.time() < deadline:
            st = self._request("GET", f"/admin/workspaces/scanStatus/{scan_id}")
            status = (st or {}).get("status")
            if status in ("Succeeded", "Failed"):
                break
            time.sleep(1.5)
        if status != "Succeeded":
            raise PowerBIError(f"el scan no terminó a tiempo (status={status})")
        result = self._request("GET", f"/admin/workspaces/scanResult/{scan_id}")
        mapping: dict[str, list[str]] = {}
        for ws in (result or {}).get("workspaces", []):
            for ds in ws.get("datasets", []):
                ds_id = ds.get("id")
                if not ds_id:
                    continue
                mapping[ds_id] = [
                    t["name"] for t in ds.get("tables", []) if _is_real_table(t.get("name"))
                ]
        return mapping

    # --- Ejecución y polling (las usa el scheduler) ---

    def refresh_dataset(
        self,
        dataset_id: str,
        tables: list[str],
        refresh_type: str,
        group_id: str | None = None,
    ) -> str | None:
        """Dispara un enhanced refresh selectivo (lista de tablas + tipo) y devuelve el
        id del refresh para pollear su estado, o None si Power BI no lo informa. Con
        `group_id` (el workspace del dataset) usa la ruta con grupo, que es la que
        corresponde para datasets que no están en "Mi área de trabajo".

        El enhanced refresh es ASÍNCRONO: el POST devuelve 202 y el refresh sigue
        corriendo. El id sale del header `Location` (.../refreshes/{id}) —verificado contra
        el tenant real— o, en su defecto, de `x-ms-request-id`."""
        body = {
            "type": _REFRESH_TYPE_MAP.get(refresh_type, "full"),
            "commitMode": "transactional",
            "objects": [{"table": t} for t in tables],
        }
        prefix = f"/groups/{group_id}" if group_id else ""
        path = f"{prefix}/datasets/{dataset_id}/refreshes"
        res = self._send("POST", path, json=body)
        location = res.headers.get("Location") or res.headers.get("location")
        refresh_id = (
            location.rstrip("/").rsplit("/", 1)[-1]
            if location
            else res.headers.get("x-ms-request-id") or res.headers.get("RequestId")
        )
        logger.info(
            "POST %s [%s tablas, %s] -> HTTP %s refreshId=%s",
            path, len(tables), body["type"], res.status_code, refresh_id,
        )
        return refresh_id

    def get_refresh_status(
        self,
        dataset_id: str,
        refresh_id: str,
        group_id: str | None = None,
    ) -> str:
        """Estado crudo de un refresh ('Unknown' = en curso para enhanced refresh,
        'Completed', 'Failed', 'Cancelled', 'Disabled'). El mapeo a nuestro RunStatus
        lo hace executor._map_status."""
        status, _error = self.get_refresh_detail(dataset_id, refresh_id, group_id)
        return status

    def get_refresh_detail(
        self,
        dataset_id: str,
        refresh_id: str,
        group_id: str | None = None,
    ) -> tuple[str, str | None]:
        """Estado crudo + motivo del fallo (si Power BI lo informa). El motivo sale de
        `messages` (enhanced refresh: lista de {message, type}) o, en su defecto, de
        `serviceExceptionJson` (historial clásico). Se trunca para guardarlo en
        lastRun.error sin arrastrar payloads enormes."""
        prefix = f"/groups/{group_id}" if group_id else ""
        data = self._request("GET", f"{prefix}/datasets/{dataset_id}/refreshes/{refresh_id}")
        data = data or {}
        status = data.get("status", "Unknown")
        return status, _extract_refresh_error(data)
