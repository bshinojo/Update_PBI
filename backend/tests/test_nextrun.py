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


# --- Hourly avanzado: sub-hora, franja horaria y días ---


def test_hourly_sub_hour_interval():
    # Cada 30 min, anclado a la medianoche: 00:00, 00:30, 01:00, ...
    f = HourlyFrequency(kind="hourly", every_minutes=30)
    assert next_run_at(f, at(2026, 6, 5, 5, 10)) == at(2026, 6, 5, 5, 30)
    assert next_run_at(f, at(2026, 6, 5, 5, 30)) == at(2026, 6, 5, 6, 0)


def test_hourly_every_minutes_takes_priority():
    # Si vienen ambos, manda every_minutes (sub-hora) sobre every_hours.
    f = HourlyFrequency(kind="hourly", every_hours=4, every_minutes=15)
    assert next_run_at(f, at(2026, 6, 5, 5, 5)) == at(2026, 6, 5, 5, 15)


def test_hourly_within_time_window():
    # Cada hora, SOLO dentro de la franja [09:00, 17:00].
    f = HourlyFrequency(kind="hourly", every_hours=1, start_hour=9, end_hour=17)
    # Antes de la franja -> primera corrida del día (09:00).
    assert next_run_at(f, at(2026, 6, 5, 7, 0)) == at(2026, 6, 5, 9, 0)
    # Dentro de la franja -> siguiente slot.
    assert next_run_at(f, at(2026, 6, 5, 9, 30)) == at(2026, 6, 5, 10, 0)
    # 17:00 no es estrictamente posterior y es el cierre -> recién al otro día 09:00.
    assert next_run_at(f, at(2026, 6, 5, 17, 0)) == at(2026, 6, 6, 9, 0)
    # Pasada la franja -> al otro día 09:00.
    assert next_run_at(f, at(2026, 6, 5, 18, 0)) == at(2026, 6, 6, 9, 0)


def test_hourly_restricted_to_days():
    # Cada 2 h, franja 06..20, SOLO los lunes (JS 1). 2026-06-05 es viernes.
    f = HourlyFrequency(
        kind="hourly", every_hours=2, start_hour=6, end_hour=20, days_of_week=[1]
    )
    assert next_run_at(f, at(2026, 6, 5, 10, 0)) == at(2026, 6, 8, 6, 0)


# --- Daily con días de la semana (opcionales) ---


def test_daily_with_days_of_week():
    # Diario 06:00 pero solo Lun/Mié/Vie (JS 1,3,5). 2026-06-05 es viernes.
    f = DailyFrequency(kind="daily", time="06:00", days_of_week=[1, 3, 5])
    assert next_run_at(f, at(2026, 6, 5, 5, 0)) == at(2026, 6, 5, 6, 0)  # viernes hoy
    assert next_run_at(f, at(2026, 6, 5, 7, 0)) == at(2026, 6, 8, 6, 0)  # -> lunes


def test_daily_empty_days_means_every_day():
    # A diferencia de weekly, daily con lista vacía = TODOS los días (días opcionales).
    f = DailyFrequency(kind="daily", time="06:00", days_of_week=[])
    assert next_run_at(f, at(2026, 6, 5, 7, 0)) == at(2026, 6, 6, 6, 0)  # sábado, igual corre


# --- display_next_run (derivado para la UI) ---


def test_display_next_run_enabled_returns_iso():
    from app.models import Schedule
    from app.nextrun import display_next_run

    sch = Schedule(
        id="s1", dataset_id="d", workspace_id="w", tables=["T"],
        frequency=DailyFrequency(kind="daily", time="06:00"), time="06:00",
        refresh_type="full", enabled=True,
    )
    assert display_next_run(sch, at(2026, 6, 5, 5, 0)) == "2026-06-05T06:00:00-03:00"


def test_display_next_run_paused_returns_none():
    from app.models import Schedule
    from app.nextrun import display_next_run

    sch = Schedule(
        id="s1", dataset_id="d", workspace_id="w", tables=["T"],
        frequency=DailyFrequency(kind="daily", time="06:00"), time="06:00",
        refresh_type="full", enabled=False,
    )
    assert display_next_run(sch, at(2026, 6, 5, 5, 0)) is None


def test_display_next_run_degenerate_frequency_returns_none():
    # Weekly sin días: next_run_at lo empuja años al futuro -> para la UI es "nunca".
    from app.models import Schedule
    from app.nextrun import display_next_run

    sch = Schedule(
        id="s1", dataset_id="d", workspace_id="w", tables=["T"],
        frequency=WeeklyFrequency.model_construct(
            kind="weekly", days_of_week=[], time="06:00"
        ),
        time="06:00", refresh_type="full", enabled=True,
    )
    assert display_next_run(sch, at(2026, 6, 5, 5, 0)) is None
