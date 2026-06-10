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


def _hourly_interval_minutes(frequency) -> int:
    """Intervalo efectivo en minutos: prioriza every_minutes, cae a every_hours*60."""
    if frequency.every_minutes is not None:
        return frequency.every_minutes
    if frequency.every_hours is not None:
        return frequency.every_hours * 60
    return 60


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
        days = set(frequency.days_of_week) if frequency.days_of_week else None
        for i in range(0, 8):
            cand = (after + timedelta(days=i)).replace(
                hour=h, minute=m, second=0, microsecond=0
            )
            js_dow = (cand.weekday() + 1) % 7  # py Lun=0..Dom=6 -> JS Dom=0..Sáb=6
            if cand > after and (days is None or js_dow in days):
                return cand
        return after + timedelta(days=3650)

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
        interval = max(1, _hourly_interval_minutes(frequency))
        start = frequency.start_hour if frequency.start_hour is not None else 0
        end = frequency.end_hour if frequency.end_hour is not None else 23
        # Días permitidos (JS 0=Dom..6=Sáb). Vacío/None = todos los días.
        days = set(frequency.days_of_week) if frequency.days_of_week else None
        # Corre cada `interval` minutos dentro de la franja [start:00, end:00].
        for i in range(0, 9):
            base_day = (after + timedelta(days=i)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            js_dow = (base_day.weekday() + 1) % 7  # py Lun=0..Dom=6 -> JS Dom=0..Sáb=6
            if days is not None and js_dow not in days:
                continue
            window_end = base_day.replace(hour=end)
            t = base_day.replace(hour=start)
            while t <= window_end:
                if t > after:
                    return t
                t += timedelta(minutes=interval)
        # Sin candidato en ~9 días (p. ej. configuración degenerada): futuro lejano.
        return after + timedelta(days=3650)

    # Exhaustividad: el tipo Frequency no tiene más variantes.
    raise ValueError(f"Frecuencia desconocida: {kind!r}")


def display_next_run(schedule, now: datetime) -> str | None:
    """Próxima corrida PARA MOSTRAR (ISO, en ART), o None si el schedule está pausado
    o la frecuencia no produce un candidato razonable (config degenerada que el
    sentinel de next_run_at empuja años al futuro). Lo usan las rutas para derivar
    Schedule.next_run_at en cada respuesta; nunca se persiste."""
    if not schedule.enabled:
        return None
    try:
        cand = next_run_at(schedule.frequency, now)
    except Exception:  # una frecuencia corrupta no debe romper la respuesta HTTP
        return None
    if cand - now > timedelta(days=366):
        return None
    return cand.isoformat(timespec="seconds")
