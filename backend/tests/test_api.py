# Tests de los 8 endpoints contra el contrato ScheduleApi. Usan un store aislado
# por test (override de dependencias) y el scheduler apagado.
import os

# Debe setearse ANTES de importar app.main (get_settings se cachea al importar).
os.environ.setdefault("PBI_SCHEDULER_ENABLED", "0")
os.environ.setdefault("PBI_DB_PATH", "/tmp/pbi-test-singleton.json")

import pytest
from fastapi.testclient import TestClient

from app.datasource import SeedDataSource
from app.dependencies import get_store
from app.main import app
from app.store import ScheduleStore


@pytest.fixture
def client(tmp_path):
    store = ScheduleStore(str(tmp_path / "db.json"), SeedDataSource())
    app.dependency_overrides[get_store] = lambda: store
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["dataSource"] == "seed"


def test_reads_and_derived_schedule_id(client):
    assert len(client.get("/workspaces").json()) == 3
    assert len(client.get("/workspaces/ws-ventas/datasets").json()) == 3
    tabs = {t["name"]: t.get("scheduleId") for t in client.get("/datasets/ds-ventas-retail/tables").json()}
    assert tabs["Ventas"] == "sch-1" and tabs["Clientes"] == "sch-1"
    assert tabs["Sucursales"] is None


def test_camelcase_and_derived_time(client):
    scheds = client.get("/datasets/ds-ventas-retail/schedules").json()
    s1 = next(s for s in scheds if s["id"] == "sch-1")
    assert s1["time"] == "06:00" and s1["frequency"]["kind"] == "daily"
    s2 = next(s for s in scheds if s["id"] == "sch-2")
    assert s2["time"] == "" and s2["frequency"]["everyHours"] == 4  # hourly sin time


def test_create_reassigns_and_keeps_invariant(client):
    res = client.post("/schedules", json={
        "datasetId": "ds-ventas-retail", "workspaceId": "ws-ventas",
        "tables": ["Ventas", "Sucursales"],
        "frequency": {"kind": "weekly", "daysOfWeek": [1, 3], "time": "09:00"},
        "refreshType": "calculate", "enabled": True,
    }).json()
    nid = res["affected"]["id"]
    assert res["affected"]["time"] == "09:00"
    bn = {t["name"]: t.get("scheduleId") for t in res["tables"]}
    assert bn["Ventas"] == nid and bn["Sucursales"] == nid and bn["Clientes"] == "sch-1"

    # Mover Clientes también vacía sch-1 -> se elimina (invariante).
    client.patch(f"/schedules/{nid}", json={"tables": ["Ventas", "Sucursales", "Clientes"]})
    ids = {s["id"] for s in client.get("/datasets/ds-ventas-retail/schedules").json()}
    assert "sch-1" not in ids and "sch-2" in ids


def test_enabled_and_delete(client):
    res = client.post("/schedules", json={
        "datasetId": "ds-calidad", "workspaceId": "ws-ops", "tables": ["Defectos"],
        "frequency": {"kind": "daily", "time": "05:00"}, "refreshType": "full", "enabled": True,
    }).json()
    nid = res["affected"]["id"]
    assert client.put(f"/schedules/{nid}/enabled", json={"enabled": False}).json()["affected"]["enabled"] is False
    dres = client.delete(f"/schedules/{nid}").json()
    assert "affected" in dres and dres["affected"] is None  # presente y null
    tabs = {t["name"]: t.get("scheduleId") for t in dres["tables"]}
    assert tabs["Defectos"] is None


def test_404_and_422(client):
    assert client.delete("/schedules/nope").status_code == 404
    assert client.put("/schedules/nope/enabled", json={"enabled": True}).status_code == 404
    bad = client.post("/schedules", json={
        "datasetId": "d", "workspaceId": "w", "tables": ["x"],
        "frequency": {"kind": "bogus"}, "refreshType": "full", "enabled": True,
    })
    assert bad.status_code == 422


def test_persistence_survives_reload(tmp_path):
    db = tmp_path / "persist.json"
    s1 = ScheduleStore(str(db), SeedDataSource())
    s1.delete("sch-1")
    # Nueva instancia desde el mismo archivo: el borrado sobrevive.
    s2 = ScheduleStore(str(db), SeedDataSource())
    ids = {s.id for s in s2.list_schedules("ds-ventas-retail")}
    assert "sch-1" not in ids and "sch-2" in ids
