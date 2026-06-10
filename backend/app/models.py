# Modelos Pydantic que ESPEJAN src/api/types.ts. Se serializan en camelCase
# (alias_generator) para que el cliente HTTP del frontend no tenga que mapear nada.
# La Frequency es una unión discriminada por `kind`, igual que en TS.
#
# Validación: los modelos de INPUT validan los rangos (time "HH:mm", horas 0–23,
# días JS 0–6, día del mes 1–28 o -1, ≥1 tabla). Como la API no tiene auth, esto
# evita que un request malformado (p. ej. time="25:99") cree un schedule que después
# rompa el cálculo de próxima corrida del scheduler.
import re
from typing import Annotated, Literal, Optional, Union

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

RefreshType = Literal["full", "dataOnly", "calculate"]
RunStatus = Literal["Completed", "Failed", "InProgress"]

_HHMM_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _check_time(v: str) -> str:
    if not _HHMM_RE.match(v):
        raise ValueError('el horario debe tener formato "HH:mm" (00:00 a 23:59)')
    return v


def _check_days(v: list[int]) -> list[int]:
    for d in v:
        if d < 0 or d > 6:
            raise ValueError("los días deben estar entre 0 (Domingo) y 6 (Sábado)")
    return v


def _check_day_of_month(v: int) -> int:
    if v != -1 and not (1 <= v <= 28):
        raise ValueError("el día del mes debe ser 1 a 28, o -1 (último día)")
    return v


# Tipos reutilizables con validación. AfterValidator no se ejecuta cuando el valor
# es None (Optional), así que los días opcionales solo se validan si vienen.
HHmm = Annotated[str, AfterValidator(_check_time)]
DaysOfWeek = Annotated[list[int], AfterValidator(_check_days)]
HourOfDay = Annotated[int, Field(ge=0, le=23)]
DayOfMonth = Annotated[int, AfterValidator(_check_day_of_month)]
NonEmptyTables = Annotated[list[str], Field(min_length=1)]


class CamelModel(BaseModel):
    # populate_by_name: acepta tanto el nombre snake_case (Python) como el alias
    # camelCase (lo que manda el frontend). Las respuestas salen siempre en camelCase.
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class Workspace(CamelModel):
    id: str
    name: str


class Dataset(CamelModel):
    id: str
    name: str
    workspace_id: str


class TableInfo(CamelModel):
    name: str
    dataset_id: str
    # Id del schedule al que pertenece esta tabla, si tiene uno.
    schedule_id: Optional[str] = None


class LastRun(CamelModel):
    status: RunStatus
    timestamp: str  # ISO 8601
    # Motivo del fallo (texto corto), solo cuando status="Failed". Permite que la UI
    # muestre POR QUÉ falló sin que el usuario tenga que entrar a los logs del VPS.
    error: Optional[str] = None


# --- Frecuencia: unión discriminada por `kind` ---


class DailyFrequency(CamelModel):
    kind: Literal["daily"]
    time: HHmm
    # Días JS opcionales (0=Domingo..6=Sábado). Ausente/vacío = todos los días.
    days_of_week: Optional[DaysOfWeek] = None


class HourlyFrequency(CamelModel):
    kind: Literal["hourly"]
    # Intervalo: every_hours (hora entera, compat) o every_minutes (sub-hora 15/20/30).
    every_hours: Optional[Annotated[int, Field(ge=1, le=24)]] = None
    every_minutes: Optional[Annotated[int, Field(ge=1, le=1440)]] = None
    # Franja horaria opcional (0..23). Ausente = todo el día (00..23).
    start_hour: Optional[HourOfDay] = None
    end_hour: Optional[HourOfDay] = None
    # Días JS opcionales (0=Domingo..6=Sábado). Ausente/vacío = todos los días.
    days_of_week: Optional[DaysOfWeek] = None

    @model_validator(mode="after")
    def _check_window(self) -> "HourlyFrequency":
        if (
            self.start_hour is not None
            and self.end_hour is not None
            and self.start_hour > self.end_hour
        ):
            raise ValueError('la hora "desde" no puede ser posterior a la "hasta"')
        return self


class WeeklyFrequency(CamelModel):
    kind: Literal["weekly"]
    # 0=Domingo .. 6=Sábado (la UI los muestra empezando por Lunes).
    days_of_week: DaysOfWeek
    time: HHmm


class MonthlyFrequency(CamelModel):
    kind: Literal["monthly"]
    # 1..28, o -1 ("último día del mes"). Ver frequency.schedule_time.
    day_of_month: DayOfMonth
    time: HHmm


Frequency = Annotated[
    Union[DailyFrequency, HourlyFrequency, WeeklyFrequency, MonthlyFrequency],
    Field(discriminator="kind"),
]


class Schedule(CamelModel):
    id: str
    dataset_id: str
    workspace_id: str
    tables: list[str]
    frequency: Frequency
    # Espejo denormalizado de frequency.time, derivado por el backend ("" para hourly).
    # El cliente nunca lo manda.
    time: str
    refresh_type: RefreshType
    enabled: bool
    last_run: Optional[LastRun] = None
    # DERIVADO al responder (routes._with_next_run): próxima corrida en ISO ART, o
    # None si está pausado. NO se persiste (el store lo deja en None al guardar) ni
    # lo manda el cliente: se recalcula con next_run_at() en cada respuesta.
    next_run_at: Optional[str] = None


# --- Inputs de mutación (el cliente no manda id/time/lastRun) ---


class CreateScheduleInput(CamelModel):
    dataset_id: str
    workspace_id: str
    tables: NonEmptyTables  # ≥1 tabla (un schedule sin tablas no tiene sentido)
    frequency: Frequency
    refresh_type: RefreshType
    enabled: bool


class UpdateScheduleInput(CamelModel):
    # Todos opcionales: es un PATCH parcial. (lastRun se omite a propósito; igual
    # que el mock, no se toca el último run desde acá.) Si se mandan tablas, ≥1
    # (cambiar a 0 tablas dejaría el schedule inválido).
    tables: Optional[NonEmptyTables] = None
    frequency: Optional[Frequency] = None
    refresh_type: Optional[RefreshType] = None
    enabled: Optional[bool] = None


class SetEnabledInput(CamelModel):
    enabled: bool


class RunRecord(CamelModel):
    """Una corrida TERMINADA del historial (una línea de runs.jsonl). Las líneas ya
    se escriben con claves camelCase (ver scheduler._record_run), así que el alias
    generator las parsea directo."""

    schedule_id: str
    dataset_id: str
    workspace_id: str
    tables: list[str]
    refresh_type: str
    refresh_id: Optional[str] = None
    status: RunStatus
    started_at: str  # ISO 8601
    finished_at: str  # ISO 8601
    error: Optional[str] = None


class ScheduleMutationResult(CamelModel):
    # El schedule creado o actualizado; None si fue eliminado.
    affected: Optional[Schedule] = None
    # Lista COMPLETA y actualizada de tablas del dataset, con scheduleId sincronizado.
    tables: list[TableInfo]
