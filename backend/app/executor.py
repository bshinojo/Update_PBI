# Quién EJECUTA un refresh cuando el scheduler decide que un schedule venció, y
# cómo se SIGUE su estado (el refresh real de Power BI es asíncrono).
#
# Protocolo de dos fases:
#   start(schedule) -> token | None
#       Dispara el refresh. Devuelve un token para pollear, o None si el resultado
#       ya es final (éxito inmediato: modo seed instantáneo, o Power BI sin id).
#   poll(schedule, token) -> PollResult
#       Estado actual ("InProgress" | "Completed" | "Failed") + motivo del fallo
#       (texto corto) cuando Power BI lo informa.
#
import logging
from typing import NamedTuple, Optional, Protocol

from .config import Settings
from .models import RunStatus, Schedule

logger = logging.getLogger("pbi.executor")


class PollResult(NamedTuple):
    status: RunStatus
    # Motivo del fallo informado por Power BI (solo tiene sentido con "Failed").
    error: Optional[str] = None


class RefreshExecutor(Protocol):
    def start(self, schedule: Schedule) -> Optional[str]: ...
    def poll(self, schedule: Schedule, token: str) -> PollResult: ...


def _map_status(raw: str) -> RunStatus:
    """Mapea el estado crudo de Power BI a nuestro RunStatus."""
    s = (raw or "").strip().lower()
    if s == "completed":
        return "Completed"
    if s in ("failed", "cancelled", "disabled"):
        return "Failed"
    # "unknown" (enhanced refresh en curso) y cualquier otro -> seguir esperando.
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

    def poll(self, schedule: Schedule, token: str) -> PollResult:
        raw, error = self._client.get_refresh_detail(
            dataset_id=schedule.dataset_id,
            refresh_id=token,
            group_id=schedule.workspace_id,
        )
        status = _map_status(raw)
        return PollResult(status=status, error=error if status == "Failed" else None)


def build_executor(settings: Settings) -> RefreshExecutor:
    from .powerbi.client import PowerBIClient

    return PowerBIRefreshExecutor(PowerBIClient(settings))
