# Tests del scheduler usando un reloj controlado y un executor falso (sin esperar
# tiempo real ni credenciales). Cubre: disparo a la hora, no re-disparo, registro
# de lastRun, manejo de fallos, y respeto del flag enabled.
from datetime import datetime

import pytest

from app.config import Settings
from app.datasource import SeedDataSource
from app.models import CreateScheduleInput, DailyFrequency
from app.nextrun import art_tz
from app.scheduler import Scheduler
from app.store import ScheduleStore

ART = art_tz()


class FakeExecutor:
    def __init__(self, fail: bool = False) -> None:
        self.calls: list[str] = []
        self.fail = fail

    def run(self, schedule) -> None:
        self.calls.append(schedule.id)
        if self.fail:
            raise RuntimeError("boom")


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


def at(h, mi):
    return datetime(2026, 6, 5, h, mi, tzinfo=ART)


def test_fires_when_due_and_records_completed(store, settings):
    sch = _make_daily(store, time="06:00")
    ex = FakeExecutor()
    sched = Scheduler(store, ex, settings)
    # Anclamos antes de las 06:00 (primera vez que lo vemos) -> no dispara aún.
    assert sched.tick(at(5, 0)) == []
    # A las 06:30 ya venció -> dispara una vez.
    assert sched.tick(at(6, 30)) == [sch.id]
    assert ex.calls == [sch.id]
    # lastRun quedó Completed.
    again = [s for s in store.all_enabled_schedules() if s.id == sch.id][0]
    assert again.last_run is not None and again.last_run.status == "Completed"


def test_does_not_refire_same_slot(store, settings):
    sch = _make_daily(store, time="06:00")
    ex = FakeExecutor()
    sched = Scheduler(store, ex, settings)
    sched.tick(at(5, 0))
    assert sched.tick(at(6, 30)) == [sch.id]
    # Mismo día, más tarde: ya corrió a las 06:30, el próximo es mañana -> no dispara.
    assert sched.tick(at(10, 0)) == []
    assert ex.calls == [sch.id]


def test_failure_records_failed(store, settings):
    sch = _make_daily(store, time="06:00")
    ex = FakeExecutor(fail=True)
    sched = Scheduler(store, ex, settings)
    sched.tick(at(5, 0))
    sched.tick(at(6, 30))
    again = [s for s in store.all_enabled_schedules() if s.id == sch.id][0]
    assert again.last_run is not None and again.last_run.status == "Failed"


def test_disabled_schedule_not_fired(store, settings):
    _make_daily(store, time="06:00", enabled=False)
    ex = FakeExecutor()
    sched = Scheduler(store, ex, settings)
    sched.tick(at(5, 0))
    assert sched.tick(at(23, 0)) == []
    assert ex.calls == []


def test_reference_uses_existing_last_run(store, settings):
    # Un schedule con lastRun ayer a las 06:00 debería disparar hoy a las 06:30
    # sin necesidad de anclaje (la referencia sale del lastRun).
    sch = _make_daily(store, time="06:00")
    from app.models import LastRun

    store.set_last_run(sch.id, LastRun(status="Completed", timestamp="2026-06-04T06:00:00-03:00"))
    ex = FakeExecutor()
    sched = Scheduler(store, ex, settings)
    assert sched.tick(at(6, 30)) == [sch.id]
