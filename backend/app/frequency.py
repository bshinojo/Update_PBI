# Port de src/domain/frequency.ts (lo que el backend necesita): el `time` canónico
# que se denormaliza en Schedule.time. "Último día del mes" se modela como -1.
from .models import Frequency

LAST_DAY = -1


def schedule_time(frequency: Frequency) -> str:
    """`time` canónico de una frecuencia. 'hourly' no tiene horario fijo -> ""."""
    if frequency.kind in ("daily", "weekly", "monthly"):
        return frequency.time  # type: ignore[union-attr]
    return ""  # hourly
