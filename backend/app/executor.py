# Quién EJECUTA realmente un refresh cuando el scheduler decide que un schedule
# venció. Abstrae el destino: en modo seed solo loguea (simula éxito, sirve para
# probar el scheduler sin credenciales); en modo powerbi dispara el enhanced
# refresh selectivo real. `run()` lanza excepción si el disparo falla.
import logging
from typing import Protocol

from .config import Settings
from .models import Schedule

logger = logging.getLogger("pbi.executor")


class RefreshExecutor(Protocol):
    def run(self, schedule: Schedule) -> None: ...


class SeedRefreshExecutor:
    """No habla con Power BI: registra el disparo y "tiene éxito". Permite probar
    el scheduler de punta a punta sin credenciales."""

    def run(self, schedule: Schedule) -> None:
        logger.info(
            "[seed] refresh dataset=%s tablas=%s tipo=%s",
            schedule.dataset_id,
            ",".join(schedule.tables),
            schedule.refresh_type,
        )


class PowerBIRefreshExecutor:
    def __init__(self, client) -> None:
        self._client = client

    def run(self, schedule: Schedule) -> None:
        self._client.refresh_dataset(
            dataset_id=schedule.dataset_id,
            tables=schedule.tables,
            refresh_type=schedule.refresh_type,
            group_id=schedule.workspace_id,
        )


def build_executor(settings: Settings) -> RefreshExecutor:
    if settings.powerbi_enabled:
        from .powerbi.client import PowerBIClient

        return PowerBIRefreshExecutor(PowerBIClient(settings))
    return SeedRefreshExecutor()
