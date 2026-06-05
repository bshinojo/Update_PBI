# Lógica PURA de "¿cuándo corre la próxima vez?". Sin estado ni efectos: dado una
# frecuencia y un instante de referencia (timezone-aware, en ART), devuelve el
# próximo datetime ESTRICTAMENTE posterior en que el schedule debería dispararse.
# El scheduler (scheduler.py) la usa para decidir qué está vencido.
import calendar
from datetime import datetime, timedelta, timezone

from .models import Frequency


def art_tz(offset_hours: int = -3) -> timezone:
    """Zona horaria fija de los horarios (ART = UTC-3, Argentina no usa DST)."""
    return timezone(timedelta(hours=offset_hours))


def _hhmm(time: str) -> tuple[int, int]:
    h, m = time.split(":")
    return int(h), int(m)


def _last_dom(year: int, month: int) -> int:
    return calendar.monthrange(year, month)[1]


def _add_month(d: datetime) -> datetime:
    # d debe tener day=1 para evitar días inválidos al cambiar de mes.
    if d.month == 12:
        return d.replace(year=d.year + 1, month=1)
    return d.replace(month=d.month + 1)


def _monthly_candidate(ref: datetime, day_of_month: int, h: int, m: int) -> datetime:
    if day_of_month == -1:  # "último día del mes"
        day = _last_dom(ref.year, ref.month)
    else:
        day = min(day_of_month, _last_dom(ref.year, ref.month))
    return ref.replace(day=day, hour=h, minute=m, second=0, microsecond=0)


def next_run_at(frequency: Frequency, after: datetime) -> datetime:
    """Próximo disparo estrictamente posterior a `after` (ambos en ART)."""
    kind = frequency.kind

    if kind == "daily":
        h, m = _hhmm(frequency.time)
        cand = after.replace(hour=h, minute=m, second=0, microsecond=0)
        if cand <= after:
            cand += timedelta(days=1)
        return cand

    if kind == "weekly":
        h, m = _hhmm(frequency.time)
        days = set(frequency.days_of_week)  # JS: 0=Domingo .. 6=Sábado
        if not days:
            # Sin días seleccionados: no corre nunca (lo empujamos al futuro lejano).
            return after + timedelta(days=3650)
        for i in range(0, 8):
            cand = (after + timedelta(days=i)).replace(
                hour=h, minute=m, second=0, microsecond=0
            )
            js_dow = (cand.weekday() + 1) % 7  # py Lun=0..Dom=6  ->  JS Dom=0..Sáb=6
            if cand > after and js_dow in days:
                return cand
        # Inalcanzable (siempre hay un día válido dentro de la semana), por las dudas:
        return after + timedelta(days=7)

    if kind == "monthly":
        h, m = _hhmm(frequency.time)
        cand = _monthly_candidate(after, frequency.day_of_month, h, m)
        if cand <= after:
            nxt = _add_month(after.replace(day=1))
            cand = _monthly_candidate(nxt, frequency.day_of_month, h, m)
        return cand

    if kind == "hourly":
        n = max(1, frequency.every_hours)
        # Corre en el minuto 0 de cada N-ésima hora, ancladas a la medianoche (0, N, 2N...).
        cand = after.replace(minute=0, second=0, microsecond=0)
        if cand <= after:
            cand += timedelta(hours=1)
        while cand.hour % n != 0:
            cand += timedelta(hours=1)
        return cand

    # Exhaustividad: el tipo Frequency no tiene más variantes.
    raise ValueError(f"Frecuencia desconocida: {kind!r}")
