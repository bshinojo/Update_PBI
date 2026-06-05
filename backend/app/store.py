# Store de schedules persistido en un archivo JSON (cero dependencias de DB:
# portable y rápido para el VPS). Es el port fiel de src/api/mock/store.ts:
# mantiene el invariante "cada schedule tiene >= 1 tabla" y la reasignación de
# tablas entre schedules del mismo dataset.
#
# Diferencia de diseño con el mock: las tablas NO guardan scheduleId acá. El
# universo de tablas lo da el DataSource (seed o Power BI) y el scheduleId se
# DERIVA de los schedules en cada respuesta (build_result). Así un mismo store
# sirve tanto para datos de ejemplo como para Power BI.
import json
import threading
import uuid
from pathlib import Path

from .datasource import DataSource
from .frequency import schedule_time
from .models import (
    CreateScheduleInput,
    LastRun,
    Schedule,
    ScheduleMutationResult,
    TableInfo,
    UpdateScheduleInput,
)
from . import seed


class NotFoundError(Exception):
    """El schedule pedido no existe (se mapea a HTTP 404 en las rutas)."""


def _gen_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


class ScheduleStore:
    def __init__(self, db_path: str, datasource: DataSource) -> None:
        self._path = Path(db_path)
        self._datasource = datasource
        self._lock = threading.Lock()
        self._schedules: list[Schedule] = self._load()

    # --- Persistencia ---

    def _load(self) -> list[Schedule]:
        if self._path.exists():
            try:
                raw = json.loads(self._path.read_text(encoding="utf-8"))
                if isinstance(raw, list):
                    return [Schedule.model_validate(item) for item in raw]
            except (json.JSONDecodeError, ValueError):
                # Archivo corrupto o esquema viejo: re-sembramos en vez de crashear.
                pass
        schedules = seed.seed_schedules()
        self._persist(schedules)
        return schedules

    def _persist(self, schedules: list[Schedule]) -> None:
        data = [s.model_dump(by_alias=True, exclude_none=True) for s in schedules]
        tmp = self._path.with_suffix(self._path.suffix + ".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(self._path)  # escritura atómica

    def _save(self) -> None:
        self._persist(self._schedules)

    # --- Helpers de reasignación / armado de respuesta ---

    def _detach_from_others(self, dataset_id: str, table_names: list[str], except_id: str) -> None:
        """Quita esas tablas de cualquier OTRO schedule del mismo dataset; si alguno
        queda sin tablas, se elimina."""
        names = set(table_names)
        for sch in list(self._schedules):
            if sch.dataset_id != dataset_id or sch.id == except_id:
                continue
            kept = [n for n in sch.tables if n not in names]
            if len(kept) == len(sch.tables):
                continue
            sch.tables = kept
            if not kept:
                self._schedules = [s for s in self._schedules if s.id != sch.id]

    def _tables_with_schedule(self, dataset_id: str) -> list[TableInfo]:
        base = self._datasource.list_tables(dataset_id)
        owner: dict[str, str] = {}
        for sch in self._schedules:
            if sch.dataset_id != dataset_id:
                continue
            for name in sch.tables:
                owner[name] = sch.id
        for t in base:
            t.schedule_id = owner.get(t.name)
        return base

    def _build_result(self, dataset_id: str, affected: Schedule | None) -> ScheduleMutationResult:
        return ScheduleMutationResult(
            affected=affected.model_copy(deep=True) if affected else None,
            tables=self._tables_with_schedule(dataset_id),
        )

    def _find(self, schedule_id: str) -> Schedule:
        for sch in self._schedules:
            if sch.id == schedule_id:
                return sch
        raise NotFoundError("El schedule no existe.")

    # --- Lecturas ---

    def list_schedules(self, dataset_id: str) -> list[Schedule]:
        with self._lock:
            return [s.model_copy(deep=True) for s in self._schedules if s.dataset_id == dataset_id]

    def list_tables(self, dataset_id: str) -> list[TableInfo]:
        with self._lock:
            return self._tables_with_schedule(dataset_id)

    def all_enabled_schedules(self) -> list[Schedule]:
        """Copia de todos los schedules habilitados (la usa el scheduler)."""
        with self._lock:
            return [s.model_copy(deep=True) for s in self._schedules if s.enabled]

    def set_last_run(self, schedule_id: str, last_run: LastRun) -> bool:
        """Registra el resultado del último run. Devuelve False si el schedule ya no
        existe (pudo borrarse entre que el scheduler lo leyó y lo intentó actualizar)."""
        with self._lock:
            for sch in self._schedules:
                if sch.id == schedule_id:
                    sch.last_run = last_run
                    self._save()
                    return True
            return False

    # --- Escrituras ---

    def create(self, inp: CreateScheduleInput) -> ScheduleMutationResult:
        with self._lock:
            sid = _gen_id("sch")
            self._detach_from_others(inp.dataset_id, inp.tables, sid)
            sch = Schedule(
                id=sid,
                dataset_id=inp.dataset_id,
                workspace_id=inp.workspace_id,
                tables=list(inp.tables),
                frequency=inp.frequency,
                time=schedule_time(inp.frequency),
                refresh_type=inp.refresh_type,
                enabled=inp.enabled,
                last_run=None,
            )
            self._schedules.append(sch)
            self._save()
            return self._build_result(inp.dataset_id, sch)

    def update(self, schedule_id: str, patch: UpdateScheduleInput) -> ScheduleMutationResult:
        with self._lock:
            sch = self._find(schedule_id)
            if patch.tables is not None:
                self._detach_from_others(sch.dataset_id, patch.tables, schedule_id)
                sch.tables = list(patch.tables)
            if patch.frequency is not None:
                sch.frequency = patch.frequency
                sch.time = schedule_time(patch.frequency)
            if patch.refresh_type is not None:
                sch.refresh_type = patch.refresh_type
            if patch.enabled is not None:
                sch.enabled = patch.enabled
            self._save()
            return self._build_result(sch.dataset_id, sch)

    def set_enabled(self, schedule_id: str, enabled: bool) -> ScheduleMutationResult:
        with self._lock:
            sch = self._find(schedule_id)
            sch.enabled = enabled
            self._save()
            return self._build_result(sch.dataset_id, sch)

    def delete(self, schedule_id: str) -> ScheduleMutationResult:
        with self._lock:
            sch = self._find(schedule_id)
            dataset_id = sch.dataset_id
            self._schedules = [s for s in self._schedules if s.id != schedule_id]
            self._save()
            return self._build_result(dataset_id, None)
