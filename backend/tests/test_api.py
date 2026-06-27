# Tests de los 8 endpoints contra el contrato ScheduleApi. Usan un store aislado
# por test (override de dependencias) y el scheduler apagado. El modo seed, el
# scheduler off y el db_path temporal los fija tests/conftest.py antes de importar
# app (get_settings se cachea), para correr hermético aunque haya un .env local.
import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_datasource, get_store
from app.main import app
from app.store import ScheduleStore
from tests._fixtures import FakeDataSource, seed_schedules


@pytest.fixture
def client(tmp_path):
    ds = FakeDataSource()
    store = ScheduleStore(str(tmp_path / "db.json"), ds)
    # Precargamos los schedules de ejemplo (el store ya no siembra: arranca vacío).
    store._schedules = seed_schedules()
    store._save()
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_datasource] = lambda: ds
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


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
    # affected omitido cuando es null (igual que el mock; el front lo trata por truthiness).
    assert dres.get("affected") is None
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


def _create_body(**freq):
    return {
        "datasetId": "ds-ventas-retail", "workspaceId": "ws-ventas",
        "tables": ["Ventas"], "refreshType": "full", "enabled": True,
        "frequency": {"kind": "daily", "time": "06:00", **freq},
    }


def test_validation_rejects_bad_frequency_fields(client):
    # Horario malformado.
    assert client.post("/schedules", json=_create_body(time="25:99")).status_code == 422
    assert client.post("/schedules", json=_create_body(time="6:00")).status_code == 422
    # Día JS fuera de rango (0..6).
    assert client.post("/schedules", json=_create_body(daysOfWeek=[7])).status_code == 422
    # Franja horaria fuera de rango / invertida (hourly).
    bad_hour = {
        "datasetId": "ds-ventas-retail", "workspaceId": "ws-ventas", "tables": ["Ventas"],
        "refreshType": "full", "enabled": True,
        "frequency": {"kind": "hourly", "everyHours": 1, "startHour": 18, "endHour": 9},
    }
    assert client.post("/schedules", json=bad_hour).status_code == 422
    # Día del mes inválido.
    bad_dom = {
        "datasetId": "ds-ventas-retail", "workspaceId": "ws-ventas", "tables": ["Ventas"],
        "refreshType": "full", "enabled": True,
        "frequency": {"kind": "monthly", "dayOfMonth": 40, "time": "06:00"},
    }
    assert client.post("/schedules", json=bad_dom).status_code == 422


def test_validation_rejects_empty_tables(client):
    # Crear sin tablas -> 422.
    assert client.post("/schedules", json=_create_body() | {"tables": []}).status_code == 422
    # PATCH a 0 tablas -> 422 (dejaría el schedule inválido).
    assert client.patch("/schedules/sch-1", json={"tables": []}).status_code == 422


def test_create_rejects_unknown_tables(client):
    # Tabla que no existe en el modelo -> 400 (si no, el refresh fallaría siempre).
    r = client.post("/schedules", json=_create_body() | {"tables": ["NoExisteEstaTabla"]})
    assert r.status_code == 400
    assert "NoExisteEstaTabla" in r.json()["detail"]


def test_tables_read_failure_is_502_with_detail(tmp_path):
    # Una lectura FALLIDA de tablas (p. ej. modelo con RLS que Power BI rechaza) NO
    # debe verse como "el modelo no tiene tablas": el endpoint responde 502 con un
    # `detail` apto para el usuario, que el front muestra en su estado de error.
    from app.datasource import TablesUnavailableError

    class RlsDataSource(FakeDataSource):
        def list_tables(self, dataset_id):
            raise TablesUnavailableError("El modelo tiene RLS; no se pudieron leer las tablas.")

    ds = RlsDataSource()
    store = ScheduleStore(str(tmp_path / "db.json"), ds)
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_datasource] = lambda: ds
    try:
        with TestClient(app) as c:
            r = c.get("/datasets/ds-ventas-retail/tables")
            assert r.status_code == 502
            assert "RLS" in r.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_persistence_survives_reload(tmp_path):
    db = tmp_path / "persist.json"
    s1 = ScheduleStore(str(db), FakeDataSource())
    s1._schedules = seed_schedules()
    s1._save()
    s1.delete("sch-1")
    # Nueva instancia desde el mismo archivo: el borrado sobrevive.
    s2 = ScheduleStore(str(db), FakeDataSource())
    ids = {s.id for s in s2.list_schedules("ds-ventas-retail")}
    assert "sch-1" not in ids and "sch-2" in ids


def test_run_now_endpoint(tmp_path):
    # POST /schedules/{id}/run dispara a demanda y devuelve el shape de mutación.
    from app.dependencies import get_scheduler
    from app.config import Settings
    from app.scheduler import Scheduler

    class RunningScheduler(Scheduler):
        # El route exige que el hilo esté vivo (sin él nadie pollea); en tests no
        # arrancamos hilos, así que lo simulamos.
        @property
        def is_running(self):
            return True

    class InstantExecutor:
        def start(self, schedule):
            return None  # resuelto al instante -> Completed

        def poll(self, schedule, token):
            from app.executor import PollResult

            return PollResult("Completed")

    ds = FakeDataSource()
    store = ScheduleStore(str(tmp_path / "db.json"), ds)
    store._schedules = seed_schedules()
    store._save()
    sched = RunningScheduler(store, InstantExecutor(), Settings(scheduler_enabled=False))
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_datasource] = lambda: ds
    app.dependency_overrides[get_scheduler] = lambda: sched
    try:
        with TestClient(app) as c:
            r = c.post("/schedules/sch-1/run")
            assert r.status_code == 200
            body = r.json()
            assert body["affected"]["id"] == "sch-1"
            assert body["affected"]["lastRun"]["status"] == "Completed"
            assert any(t["name"] == "Ventas" for t in body["tables"])
            # Inexistente -> 404.
            assert c.post("/schedules/nope/run").status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_run_now_endpoint_503_without_scheduler(client):
    # Con el scheduler apagado (conftest: PBI_SCHEDULER_ENABLED=0, hilo nunca
    # arranca) la ejecución a demanda se rechaza con un mensaje claro.
    r = client.post("/schedules/sch-1/run")
    assert r.status_code == 503


# --- nextRunAt derivado (solo en las respuestas, nunca persistido) ---


def test_schedules_carry_next_run_at(client):
    scheds = {s["id"]: s for s in client.get("/datasets/ds-ventas-retail/schedules").json()}
    # Habilitado -> trae el próximo disparo en ISO ART.
    assert "nextRunAt" in scheds["sch-1"]
    assert scheds["sch-1"]["nextRunAt"].endswith("-03:00")
    # Las mutaciones también lo derivan en `affected`.
    res = client.put("/schedules/sch-1/enabled", json={"enabled": False}).json()
    # Pausado -> el campo va AUSENTE (None se excluye), igual que los demás opcionales.
    assert "nextRunAt" not in res["affected"]
    res = client.put("/schedules/sch-1/enabled", json={"enabled": True}).json()
    assert "nextRunAt" in res["affected"]


def test_next_run_at_not_persisted(tmp_path):
    import json as _json

    db = tmp_path / "db.json"
    store = ScheduleStore(str(db), FakeDataSource())
    store._schedules = seed_schedules()
    store._save()
    raw = _json.loads(db.read_text(encoding="utf-8"))
    assert all("nextRunAt" not in item for item in raw)


# --- Historial de corridas (GET /schedules/{id}/runs) ---


def test_runs_history_endpoint(client, tmp_path):
    from app.dependencies import get_runlog
    from app.runlog import RunLog

    rl = RunLog(str(tmp_path / "runs.jsonl"))
    base = {
        "datasetId": "ds-ventas-retail", "workspaceId": "ws-ventas",
        "tables": ["Ventas"], "refreshType": "full", "refreshId": "r1",
    }
    rl.append(base | {"scheduleId": "sch-1", "status": "Completed",
                      "startedAt": "2026-06-09T06:00:00-03:00",
                      "finishedAt": "2026-06-09T06:04:00-03:00", "error": None})
    rl.append(base | {"scheduleId": "sch-1", "status": "Failed",
                      "startedAt": "2026-06-10T06:00:00-03:00",
                      "finishedAt": "2026-06-10T06:01:00-03:00",
                      "error": "Credencial vencida"})
    rl.append(base | {"scheduleId": "OTRO", "status": "Completed",
                      "startedAt": "2026-06-10T07:00:00-03:00",
                      "finishedAt": "2026-06-10T07:01:00-03:00", "error": None})
    app.dependency_overrides[get_runlog] = lambda: rl
    try:
        r = client.get("/schedules/sch-1/runs")
        assert r.status_code == 200
        runs = r.json()
        # Solo las de sch-1, la más reciente primero, con el motivo del fallo.
        assert [x["status"] for x in runs] == ["Failed", "Completed"]
        assert runs[0]["error"] == "Credencial vencida"
        assert "error" not in runs[1]  # None excluido del JSON
        # limit acota el resultado.
        assert len(client.get("/schedules/sch-1/runs?limit=1").json()) == 1
        # Sin historial -> lista vacía (no 404: el schedule pudo no correr nunca).
        assert client.get("/schedules/sch-2/runs").json() == []
    finally:
        app.dependency_overrides.pop(get_runlog, None)


# --- Informe global (GET /report) ---


def test_report_counts_and_history(client, tmp_path):
    from app.dependencies import get_runlog
    from app.runlog import RunLog

    rl = RunLog(str(tmp_path / "runs.jsonl"))
    base = {"tables": ["Ventas"], "refreshType": "full", "refreshId": "r1"}
    rl.append(base | {"scheduleId": "sch-1", "datasetId": "ds-ventas-retail",
                      "workspaceId": "ws-ventas", "status": "Completed",
                      "startedAt": "2026-06-09T06:00:00-03:00",
                      "finishedAt": "2026-06-09T06:04:00-03:00"})
    rl.append(base | {"scheduleId": "sch-3", "datasetId": "ds-pyl",
                      "workspaceId": "ws-finanzas", "status": "Failed",
                      "startedAt": "2026-06-10T01:00:00-03:00",
                      "finishedAt": "2026-06-10T01:01:00-03:00", "error": "Sin permisos"})
    app.dependency_overrides[get_runlog] = lambda: rl
    try:
        body = client.get("/report").json()
        # Contadores de programaciones (seed: 6, sch-5 pausada).
        assert body["schedules"] == {"total": 6, "active": 5, "paused": 1}
        runs = body["runs"]
        # Más reciente primero (la Failed del 10/06 antes que la Completed del 09/06).
        assert [x["status"] for x in runs] == ["Failed", "Completed"]
        # Nombres legibles resueltos desde la fuente de datos (no ids crudos).
        assert runs[0]["datasetName"] == "P&L Consolidado"
        assert runs[0]["workspaceName"] == "Finanzas"
        assert runs[0]["error"] == "Sin permisos"
        assert runs[1]["datasetName"] == "Ventas Retail"
        assert "error" not in runs[1]  # None excluido del JSON
        # limit acota.
        assert len(client.get("/report?limit=1").json()["runs"]) == 1
    finally:
        app.dependency_overrides.pop(get_runlog, None)


def test_report_merges_in_progress_first(tmp_path):
    # Una actualización EN CURSO (en memoria del scheduler) aparece en el informe,
    # arriba del historial terminado, con finishedAt ausente.
    from app.config import Settings
    from app.dependencies import get_runlog, get_scheduler
    from app.executor import PollResult
    from app.runlog import RunLog
    from app.scheduler import Scheduler

    class _Exec:
        def start(self, schedule):
            return "r-live"  # async -> queda InProgress en _pending

        def poll(self, schedule, token):
            return PollResult("InProgress")

    ds = FakeDataSource()
    store = ScheduleStore(str(tmp_path / "db.json"), ds)
    store._schedules = seed_schedules()
    store._save()
    rl = RunLog(str(tmp_path / "runs.jsonl"))
    rl.append({"scheduleId": "sch-1", "datasetId": "ds-ventas-retail",
               "workspaceId": "ws-ventas", "tables": ["Ventas"], "refreshType": "full",
               "status": "Completed", "startedAt": "2026-06-09T06:00:00-03:00",
               "finishedAt": "2026-06-09T06:04:00-03:00"})
    sched = Scheduler(store, _Exec(), Settings(scheduler_enabled=False))
    sched.run_now("sch-3")  # dispara a demanda -> _pending tiene sch-3 InProgress

    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_datasource] = lambda: ds
    app.dependency_overrides[get_runlog] = lambda: rl
    app.dependency_overrides[get_scheduler] = lambda: sched
    try:
        with TestClient(app) as c:
            runs = c.get("/report").json()["runs"]
            assert len(runs) == 2
            # La En curso primero (su startedAt es "ahora", > el finishedAt histórico).
            assert runs[0]["status"] == "InProgress" and runs[0]["scheduleId"] == "sch-3"
            assert "finishedAt" not in runs[0]  # aún no terminó -> None excluido
            assert runs[0]["datasetName"] == "P&L Consolidado"
            assert runs[1]["status"] == "Completed"
    finally:
        app.dependency_overrides.clear()
