# Fuente de datos para LECTURAS (workspaces / datasets / tablas). Sale de Power BI
# (REST API + XMLA). Los schedules NO viven acá: los maneja el store local, que
# después "pinta" el scheduleId sobre estas tablas.
from typing import Protocol

from .config import Settings
from .models import Dataset, TableInfo, Workspace


class DataSource(Protocol):
    def list_workspaces(self) -> list[Workspace]: ...
    def list_datasets(self, workspace_id: str) -> list[Dataset]: ...
    def list_tables(self, dataset_id: str) -> list[TableInfo]: ...


class PowerBIDataSource:
    """Lee de la REST API de Power BI a través de PowerBIClient."""

    def __init__(self, client) -> None:
        self._client = client

    def list_workspaces(self) -> list[Workspace]:
        return self._client.list_workspaces()

    def list_datasets(self, workspace_id: str) -> list[Dataset]:
        return self._client.list_datasets(workspace_id)

    def list_tables(self, dataset_id: str) -> list[TableInfo]:
        return self._client.list_tables(dataset_id)


def build_datasource(settings: Settings) -> DataSource:
    from .powerbi.client import PowerBIClient

    return PowerBIDataSource(PowerBIClient(settings))
