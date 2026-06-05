# Fuente de datos para LECTURAS (workspaces / datasets / tablas). Abstrae de dónde
# salen: del seed (sin credenciales) o de Power BI. Los schedules NO viven acá:
# los maneja el store local, que después "pinta" el scheduleId sobre estas tablas.
from typing import Protocol

from .config import Settings
from .models import Dataset, TableInfo, Workspace
from . import seed


class DataSource(Protocol):
    def list_workspaces(self) -> list[Workspace]: ...
    def list_datasets(self, workspace_id: str) -> list[Dataset]: ...
    def list_tables(self, dataset_id: str) -> list[TableInfo]: ...


class SeedDataSource:
    """Datos de ejemplo en memoria. No requiere credenciales."""

    def __init__(self) -> None:
        self._workspaces = seed.seed_workspaces()
        self._datasets = seed.seed_datasets()
        self._tables = seed.seed_tables()

    def list_workspaces(self) -> list[Workspace]:
        return [w.model_copy(deep=True) for w in self._workspaces]

    def list_datasets(self, workspace_id: str) -> list[Dataset]:
        return [d.model_copy(deep=True) for d in self._datasets if d.workspace_id == workspace_id]

    def list_tables(self, dataset_id: str) -> list[TableInfo]:
        return [t.model_copy(deep=True) for t in self._tables if t.dataset_id == dataset_id]


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
    if settings.powerbi_enabled:
        # Import perezoso: el modo seed no necesita httpx ni credenciales.
        from .powerbi.client import PowerBIClient

        return PowerBIDataSource(PowerBIClient(settings))
    return SeedDataSource()
