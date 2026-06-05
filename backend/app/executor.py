# Quién EJECUTA un refresh cuando el scheduler decide que un schedule venció, y
# cómo se SIGUE su estado (el refresh real de Power BI es asíncrono).
#
# Protocolo de dos fases:
#   start(schedule) -> token | None
#       Dispara el refresh. Devuelve un token para pollear, o None si el resultado
#       ya es final (éxito inmediato: modo seed instantáneo, o Power BI sin id).
#   poll(schedule, token) -> RunStatus
#       Estado actual: "InProgress" (seguir esperando) | "Completed" | "Failed".
#
# Modo seed (sin credenciales): por defecto es instantáneo (start devuelve None).
# Con PBI_SEED_SIMULATE_REFRESH_TICKS > 0 simula un refresh que completa tras N
# polls, útil para ver el "En curso" progresar en la demo.
import logging
from typing import Optional, Protocol

from .config import Settings
from .models import RunStatus, Schedule

logger = logging.getLogger("pbi.executor")


class RefreshExecutor(Protocol):
    def start(self, schedule: Schedule) -> Optional[str]: ...
    def poll(self, schedule: Schedule, token: str) -> RunStatus: ...


def _map_status(raw: str) -> RunStatus:
    """Mapea el estado crudo de Power BI a nuestro RunStatus."""
    s = (raw or "").strip().lower()
    if s == "completed":
        return "Completed"
    if s in ("failed", "cancelled", "disabled"):
        return "Failed"
    # "unknown" (enhanced refresh en curso) y cualquier otro -> seguir esperando.
    return "InProgress"


class SeedRefreshExecutor:
    """No habla con Power BI. Por defecto simula éxito inmediato; con simulate_ticks
    > 0 simula un refresh que tarda esa cantidad de polls en completar."""

    def __init__(self, simulate_ticks: int = 0) -> None:
        self._simulate = max(0, simulate_ticks)
        self._remaining: dict[str, int] = {}
        self._seq = 0

    def start(self, schedule: Schedule) -> Optional[str]:
        logger.info(
            "[seed] refresh dataset=%s tablas=%s tipo=%s",
            schedule.dataset_id,
            ",".join(schedule.tables),
            schedule.refresh_type,
        )
        if self._simulate == 0:
            return None  # éxito instantáneo
        self._seq += 1
        token = f"seed-{schedule.id}-{self._seq}"
        self._remaining[token] = self._simulate
        return token

    def poll(self, schedule: Schedule, token: str) -> RunStatus:
        left = self._remaining.get(token, 0)
        if left <= 1:
            self._remaining.pop(token, None)
            return "Completed"
        self._remaining[token] = left - 1
        return "InProgress"


class PowerBIRefreshExecutor:
    def __init__(self, client) -> None:
        self._client = client

    def start(self, schedule: Schedule) -> Optional[str]:
        return self._client.refresh_dataset(
            dataset_id=schedule.dataset_id,
            tables=schedule.tables,
            refresh_type=schedule.refresh_type,
            group_id=schedule.workspace_id,
        )

    def poll(self, schedule: Schedule, token: str) -> RunStatus:
        raw = self._client.get_refresh_status(
            dataset_id=schedule.dataset_id,
            refresh_id=token,
            group_id=schedule.workspace_id,
        )
        return _map_status(raw)


def build_executor(settings: Settings) -> RefreshExecutor:
    if settings.powerbi_enabled:
        from .powerbi.client import PowerBIClient

        return PowerBIRefreshExecutor(PowerBIClient(settings))
    return SeedRefreshExecutor(simulate_ticks=settings.seed_simulate_refresh_ticks)
