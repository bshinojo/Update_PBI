# Wiring de las dependencias (singletons del proceso): la fuente de datos, el
# store y el scheduler se construyen una sola vez al arrancar, a partir del .env.
from .config import get_settings
from .datasource import DataSource, build_datasource
from .executor import build_executor
from .runlog import NullRunLog, RunLog
from .scheduler import Scheduler
from .store import ScheduleStore

_settings = get_settings()
_datasource: DataSource = build_datasource(_settings)
_store = ScheduleStore(_settings.db_path, _datasource)
_runlog = RunLog(_settings.runs_log_path) if _settings.runs_log_path else NullRunLog()
_scheduler = Scheduler(_store, build_executor(_settings), _settings, runlog=_runlog)


def get_datasource() -> DataSource:
    return _datasource


def get_store() -> ScheduleStore:
    return _store


def get_scheduler() -> Scheduler:
    return _scheduler
