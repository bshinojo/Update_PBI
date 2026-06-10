# Tests del executor: mapeo de estados de Power BI -> RunStatus, y que el
# PowerBIRefreshExecutor delegue correctamente en el cliente (con un cliente falso,
# sin red ni credenciales). El camino real (HTTP) queda para verificar con creds.
from app.executor import PowerBIRefreshExecutor, _map_status
from app.models import DailyFrequency, Schedule


def _sched():
    return Schedule(
        id="sch-x", dataset_id="ds-1", workspace_id="ws-1", tables=["A", "B"],
        frequency=DailyFrequency(kind="daily", time="06:00"), time="06:00",
        refresh_type="dataOnly", enabled=True,
    )


def test_map_status():
    assert _map_status("Completed") == "Completed"
    assert _map_status("completed") == "Completed"
    assert _map_status("Failed") == "Failed"
    assert _map_status("Cancelled") == "Failed"
    assert _map_status("Disabled") == "Failed"
    # "Unknown" (enhanced refresh en curso) y cualquier otro -> seguir esperando.
    assert _map_status("Unknown") == "InProgress"
    assert _map_status("") == "InProgress"
    assert _map_status("loquesea") == "InProgress"


class FakeClient:
    def __init__(self, status="Completed", error=None):
        self.refresh_args = None
        self.status_args = None
        self._status = status
        self._error = error

    def refresh_dataset(self, dataset_id, tables, refresh_type, group_id=None):
        self.refresh_args = dict(dataset_id=dataset_id, tables=tables,
                                 refresh_type=refresh_type, group_id=group_id)
        return "refresh-123"

    def get_refresh_detail(self, dataset_id, refresh_id, group_id=None):
        self.status_args = dict(dataset_id=dataset_id, refresh_id=refresh_id, group_id=group_id)
        return self._status, self._error


def test_powerbi_executor_start_passes_schedule_fields():
    client = FakeClient()
    ex = PowerBIRefreshExecutor(client)
    token = ex.start(_sched())
    assert token == "refresh-123"
    assert client.refresh_args == dict(
        dataset_id="ds-1", tables=["A", "B"], refresh_type="dataOnly", group_id="ws-1"
    )


def test_powerbi_executor_poll_maps_status():
    client = FakeClient(status="Unknown")
    ex = PowerBIRefreshExecutor(client)
    assert ex.poll(_sched(), "refresh-123") == ("InProgress", None)
    assert client.status_args == dict(dataset_id="ds-1", refresh_id="refresh-123", group_id="ws-1")


def test_powerbi_executor_poll_carries_error_only_when_failed():
    # El motivo viaja con "Failed"...
    ex = PowerBIRefreshExecutor(FakeClient(status="Failed", error="Sin permisos"))
    assert ex.poll(_sched(), "r1") == ("Failed", "Sin permisos")
    # ...pero se descarta si el estado no es de fallo (mensajes informativos de PBI).
    ex = PowerBIRefreshExecutor(FakeClient(status="Completed", error="warning x"))
    assert ex.poll(_sched(), "r1") == ("Completed", None)
