# Tests del historial de corridas (runlog) y de que el scheduler lo alimenta en los
# estados terminales (sin red ni credenciales: executor falso + reloj controlado).
import json
from datetime import datetime

from app.config import Settings
from app.models import CreateScheduleInput, DailyFrequency
from app.nextrun import art_tz
from app.runlog import RunLog
from app.scheduler import Scheduler
from app.store import ScheduleStore
from tests._fixtures import FakeDataSource

ART = art_tz()


class _Exec:
    """start() devuelve `token` (None = inmediato); poll() consume `polls` y si no quedan, Completed."""

    def __init__(self, token=None, polls=None):
        self._token = token
        self._polls = list(polls or [])

    def start(self, schedule):
        return self._token

    def poll(self, schedule, token):
        return self._polls.pop(0) if self._polls else "Completed"


def _at(h, mi):
    return datetime(2026, 6, 5, h, mi, tzinfo=ART)


def _daily(store):
    return store.create(
        CreateScheduleInput(
            dataset_id="ds-calidad", workspace_id="ws-ops", tables=["Inspecciones"],
            frequency=DailyFrequency(kind="daily", time="06:00"), refresh_type="full", enabled=True,
        )
    ).affected


def _read(path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def test_runlog_append_writes_jsonl(tmp_path):
    rl = RunLog(str(tmp_path / "runs.jsonl"))
    rl.append({"a": 1})
    rl.append({"b": 2})
    assert _read(tmp_path / "runs.jsonl") == [{"a": 1}, {"b": 2}]


def test_runlog_never_raises_on_bad_path():
    # Directorio inexistente: abrir para append falla, pero RunLog lo traga (no propaga).
    RunLog("no/such/dir/runs.jsonl").append({"a": 1})


def test_scheduler_records_completed_run(tmp_path):
    store = ScheduleStore(str(tmp_path / "db.json"), FakeDataSource())
    runs = tmp_path / "runs.jsonl"
    sch = _daily(store)
    sched = Scheduler(store, _Exec(token=None), Settings(scheduler_enabled=False), runlog=RunLog(str(runs)))
    sched.tick(_at(5, 0))   # ancla, no dispara
    sched.tick(_at(6, 30))  # dispara -> Completed (token None)
    recs = _read(runs)
    assert len(recs) == 1
    assert recs[0]["scheduleId"] == sch.id
    assert recs[0]["status"] == "Completed"
    assert recs[0]["tables"] == ["Inspecciones"]
    assert recs[0]["refreshType"] == "full"


def test_scheduler_records_async_run_with_refresh_id(tmp_path):
    store = ScheduleStore(str(tmp_path / "db.json"), FakeDataSource())
    runs = tmp_path / "runs.jsonl"
    _daily(store)
    sched = Scheduler(
        store, _Exec(token="r1", polls=["InProgress", "Completed"]),
        Settings(scheduler_enabled=False), runlog=RunLog(str(runs)),
    )
    sched.tick(_at(5, 0))
    sched.tick(_at(6, 30))   # dispara -> InProgress: todavía NO hay record terminal
    assert _read(runs) == []
    sched.tick(_at(6, 31))   # poll -> Completed -> record con refreshId
    recs = _read(runs)
    assert len(recs) == 1
    assert recs[0]["status"] == "Completed"
    assert recs[0]["refreshId"] == "r1"
