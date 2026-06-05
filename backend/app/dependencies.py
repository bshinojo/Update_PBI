# Wiring de las dependencias (singletons del proceso): la fuente de datos y el
# store se construyen una sola vez al arrancar, a partir de la config del .env.
from .config import get_settings
from .datasource import DataSource, build_datasource
from .store import ScheduleStore

_settings = get_settings()
_datasource: DataSource = build_datasource(_settings)
_store = ScheduleStore(_settings.db_path, _datasource)


def get_datasource() -> DataSource:
    return _datasource


def get_store() -> ScheduleStore:
    return _store
