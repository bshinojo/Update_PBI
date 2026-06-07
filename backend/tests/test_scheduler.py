# Tests del scheduler usando un reloj controlado y un executor falso (sin esperar
# tiempo real ni credenciales). Cubre: disparo a la hora, no re-disparo, registro
# de lastRun, manejo de fallos, respeto del flag enabled, y el polling de refreshes
# asíncronos (InProgress -> Completed/Failed, timeout, no re-disparo en vuelo).
from datetime import datetime, timedelta

import pytest

from app.config import Settings
from app.datasource import SeedDataSource
from app.models import CreateScheduleInput, DailyFrequency, HourlyFrequency, LastRun
from app.nextrun import art_tz
from app.scheduler import Scheduler
from app.store import ScheduleStore

ART = art_tz()


class FakeExecutor:
    """start() devuelve `token` (None = éxito inmediato). poll() consume `poll_results`
    en orden y, agotados, devuelve 'Completed'."""

    def __init__(self, token=None, poll_results=None, fail_start=False) -> None:
        self.start_calls: list[str] = []
        self.poll_calls: list[tuple[str, str]] = []
        self._token = token
        self._poll_results = list(poll_results or [])
        self._fail_start = fail_start

    def start(self, schedule):
        self.start_calls.append(schedule.id)
        if self._fail_start:
            raise RuntimeError("boom")
        return self._token

    def poll(self, schedule, token):
        self.poll_calls.append((schedule.id, token))
        return self._poll_results.pop(0) if self._poll_results else "Completed"


@pytest.fixture
def store(tmp_path):
    db = tmp_path / "sched.json"
    s = ScheduleStore(str(db), SeedDataSource())
    # Arrancamos sin los schedules sembrados para aislar lo que dispara el scheduler.
    s._schedules.clear()
    s._save()
    return s


@pytest.fixture
def settings():
    return Settings(scheduler_enabled=False)  # no arrancamos el hilo en los tests


def make_settings(**over):
    return Settings(scheduler_enabled=False, **over)


def _make_daily(store, time="06:00", enabled=True):
    res = store.create(
        CreateScheduleInput(
            dataset_id="ds-calidad",
            workspace_id="ws-ops",
            tables=["Inspecciones"],
            frequency=DailyFrequency(kind="daily", time=time),
            refresh_type="full",
            enabled=enabled,
        )
    )
    return res.affected


def _make_hourly(store, every_hours=1):
    res = store.create(
        CreateScheduleInput(
            dataset_id="ds-calidad",
            workspace_id="ws-ops",
            tables=["Inspecciones"],
            frequency=HourlyFrequency(kind="hourly", every_hours=every_hours),
            refresh_type="full",
            enabled=True,
        )
    )
    return res.affected


def at(h, mi):
    return datetime(2026, 6, 5, h, mi, tzinfo=ART)


def _status(store, sid):
    sch = next((s for s in store.all_enabled_schedules() if s.id == sid), None)
    return sch.last_run.status if sch and sch.last_run else None


# --- Disparo inmediato (token None) ---


def test_fires_when_due_and_records_completed(store, settings):
    sch = _make_daily(store, time="06:00")
    ex = FakeExecutor()  # token None -> completa al instante
    sched = Scheduler(store, ex, settings)
    # Anclamos antes de las 06:00 (primera vez que lo vemos) -> no dispara aún.
    assert sched.tick(at(5, 0)) == []
    # A las 06:30 ya venció -> dispara una vez.
    assert sched.tick(at(6, 30)) == [sch.id]
    assert ex.start_calls == [sch.id]
    assert _status(store, sch.id) == "Completed"


def test_does_not_refire_same_slot(store, settings):
    sch = _make_daily(store, time="06:00")
    ex = FakeExecutor()
    sched = Scheduler(store, ex, settings)
    sched.tick(at(5, 0))
    assert sched.tick(at(6, 30)) == [sch.id]
    # Mismo día, más tarde: ya corrió a las 06:30, el próximo es mañana -> no dispara.
    assert sched.tick(at(10, 0)) == []
    assert ex.start_calls == [sch.id]


def test_failure_on_start_records_failed(store, settings):
    sch = _make_daily(store, time="06:00")
    ex = FakeExecutor(fail_start=True)
    sched = Scheduler(store, ex, settings)
    sched.tick(at(5, 0))
    sched.tick(at(6, 30))
    assert _status(store, sch.id) == "Failed"


def test_disabled_schedule_not_fired(store, settings):
    _make_daily(store, time="06:00", enabled=False)
    ex = FakeExecutor()
    sched = Scheduler(store, ex, settings)
    sched.tick(at(5, 0))
    assert sched.tick(at(23, 0)) == []
    assert ex.start_calls == []


def test_reference_uses_existing_last_run(store, settings):
    # Un schedule con lastRun ayer a las 06:00 debería disparar hoy a las 06:30
    # sin necesidad de anclaje (la referencia sale del lastRun).
    sch = _make_daily(store, time="06:00")
    store.set_last_run(sch.id, LastRun(status="Completed", timestamp="2026-06-04T06:00:00-03:00"))
    ex = FakeExecutor()
    sched = Scheduler(store, ex, settings)
    assert sched.tick(at(6, 30)) == [sch.id]


# --- Polling de refreshes asíncronos (token != None) ---


def test_polls_until_completed(store, settings):
    sch = _make_daily(store, time="06:00")
    ex = FakeExecutor(token="r1", poll_results=["InProgress", "InProgress", "Completed"])
    sched = Scheduler(store, ex, settings)
    sched.tick(at(5, 0))            # ancla, no dispara
    sched.tick(at(6, 30))          # dispara -> InProgress; poll #1 -> InProgress
    assert _status(store, sch.id) == "InProgress"
    sched.tick(at(6, 31))          # poll #2 -> InProgress
    assert _status(store, sch.id) == "InProgress"
    sched.tick(at(6, 32))          # poll #3 -> Completed
    assert _status(store, sch.id) == "Completed"
    assert ex.start_calls == [sch.id]  # se disparó una sola vez


def test_poll_failure_marks_failed(store, settings):
    sch = _make_daily(store, time="06:00")
    ex = FakeExecutor(token="r1", poll_results=["Failed"])
    sched = Scheduler(store, ex, settings)
    sched.tick(at(5, 0))
    sched.tick(at(6, 30))
    assert _status(store, sch.id) == "Failed"


def test_poll_timeout_marks_failed(store):
    sch = _make_daily(store, time="06:00")
    ex = FakeExecutor(token="r1", poll_results=["InProgress"] * 10)  # nunca completa
    sched = Scheduler(store, ex, make_settings(refresh_poll_timeout_min=5))
    sched.tick(at(5, 0))
    sched.tick(at(6, 30))                       # dispara, InProgress
    assert _status(store, sch.id) == "InProgress"
    sched.tick(at(6, 30) + timedelta(minutes=6))  # supera el timeout de 5min -> Failed
    assert _status(store, sch.id) == "Failed"


def test_defers_second_schedule_same_dataset(store, settings):
    # Dos schedules del MISMO dataset que vencen a la vez: Power BI no permite dos
    # refreshes concurrentes sobre el mismo dataset, así que el segundo se difiere.
    a = store.create(
        CreateScheduleInput(
            dataset_id="ds-calidad", workspace_id="ws-ops", tables=["Inspecciones"],
            frequency=DailyFrequency(kind="daily", time="06:00"),
            refresh_type="full", enabled=True,
        )
    ).affected
    b = store.create(
        CreateScheduleInput(
            dataset_id="ds-calidad", workspace_id="ws-ops", tables=["Defectos"],
            frequency=DailyFrequency(kind="daily", time="06:00"),
            refresh_type="full", enabled=True,
        )
    ).affected
    ex = FakeExecutor(token="r", poll_results=["InProgress", "Completed"])
    sched = Scheduler(store, ex, settings)
    sched.tick(at(5, 0))                  # ancla ambos
    fired1 = sched.tick(at(6, 30))        # ambos vencen; SOLO uno dispara
    assert len(fired1) == 1
    first = fired1[0]
    second = b.id if first == a.id else a.id
    # Mientras el primero sigue en vuelo, el segundo queda diferido.
    assert sched.tick(at(6, 31)) == []   # poll del primero -> Completed; segundo aún diferido
    # Liberado el dataset, el segundo por fin dispara.
    assert sched.tick(at(6, 32)) == [second]
    assert sorted(ex.start_calls) == sorted([a.id, b.id])


def test_not_refired_while_pending(store, settings):
    sch = _make_hourly(store, every_hours=1)
    ex = FakeExecutor(token="r1", poll_results=["InProgress"] * 10)  # queda en vuelo
    sched = Scheduler(store, ex, settings)
    sched.tick(at(6, 30))   # ancla 06:30, próximo disparo 07:00 -> no dispara
    assert sched.tick(at(7, 0)) == [sch.id]   # dispara -> InProgress (pending)
    # A las 08:00 volvería a vencer, pero hay un refresh en vuelo -> no se re-dispara.
    assert sched.tick(at(8, 0)) == []
    assert ex.start_calls == [sch.id]
