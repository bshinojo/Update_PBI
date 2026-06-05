# Tests de la lógica pura de próximas corridas (sin estado, sin credenciales).
from datetime import datetime

from app.models import (
    DailyFrequency,
    HourlyFrequency,
    MonthlyFrequency,
    WeeklyFrequency,
)
from app.nextrun import art_tz, next_run_at

ART = art_tz()


def at(y, mo, d, h, mi):
    return datetime(y, mo, d, h, mi, tzinfo=ART)


def test_daily_same_day_then_next():
    f = DailyFrequency(kind="daily", time="06:00")
    # Antes de las 06:00 -> corre hoy.
    assert next_run_at(f, at(2026, 6, 5, 5, 0)) == at(2026, 6, 5, 6, 0)
    # Justo a las 06:00 (no estrictamente posterior) -> mañana.
    assert next_run_at(f, at(2026, 6, 5, 6, 0)) == at(2026, 6, 6, 6, 0)
    # Pasadas las 06:00 -> mañana.
    assert next_run_at(f, at(2026, 6, 5, 7, 0)) == at(2026, 6, 6, 6, 0)


def test_hourly_anchored_to_midnight():
    f = HourlyFrequency(kind="hourly", every_hours=4)  # 0,4,8,12,16,20
    assert next_run_at(f, at(2026, 6, 5, 5, 30)) == at(2026, 6, 5, 8, 0)
    assert next_run_at(f, at(2026, 6, 5, 8, 0)) == at(2026, 6, 5, 12, 0)
    # Cruza la medianoche.
    assert next_run_at(f, at(2026, 6, 5, 21, 0)) == at(2026, 6, 6, 0, 0)


def test_hourly_every_one_hour():
    f = HourlyFrequency(kind="hourly", every_hours=1)
    assert next_run_at(f, at(2026, 6, 5, 5, 30)) == at(2026, 6, 5, 6, 0)


def test_weekly_picks_next_selected_day():
    # Lun, Mié, Vie -> JS 1,3,5. 2026-06-05 es viernes.
    f = WeeklyFrequency(kind="weekly", days_of_week=[1, 3, 5], time="07:30")
    # Viernes antes de 07:30 -> hoy.
    assert next_run_at(f, at(2026, 6, 5, 6, 0)) == at(2026, 6, 5, 7, 30)
    # Viernes después de 07:30 -> próximo lunes (08).
    assert next_run_at(f, at(2026, 6, 5, 9, 0)) == at(2026, 6, 8, 7, 30)
    # Sábado -> lunes.
    assert next_run_at(f, at(2026, 6, 6, 0, 0)) == at(2026, 6, 8, 7, 30)


def test_weekly_no_days_never_runs():
    f = WeeklyFrequency(kind="weekly", days_of_week=[], time="07:30")
    nxt = next_run_at(f, at(2026, 6, 5, 6, 0))
    assert nxt.year >= 2036  # empujado al futuro lejano


def test_monthly_day_and_rollover():
    f = MonthlyFrequency(kind="monthly", day_of_month=1, time="01:00")
    assert next_run_at(f, at(2026, 6, 1, 0, 30)) == at(2026, 6, 1, 1, 0)
    assert next_run_at(f, at(2026, 6, 1, 2, 0)) == at(2026, 7, 1, 1, 0)
    # Diciembre -> enero del año siguiente.
    assert next_run_at(f, at(2026, 12, 1, 2, 0)) == at(2027, 1, 1, 1, 0)


def test_monthly_last_day():
    f = MonthlyFrequency(kind="monthly", day_of_month=-1, time="23:00")
    # Febrero 2026 (no bisiesto) -> día 28.
    assert next_run_at(f, at(2026, 2, 10, 0, 0)) == at(2026, 2, 28, 23, 0)
    # Pasado el último día -> último día del mes siguiente (marzo = 31).
    assert next_run_at(f, at(2026, 2, 28, 23, 30)) == at(2026, 3, 31, 23, 0)
