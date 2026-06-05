# Modelos Pydantic que ESPEJAN src/api/types.ts. Se serializan en camelCase
# (alias_generator) para que el cliente HTTP del frontend no tenga que mapear nada.
# La Frequency es una unión discriminada por `kind`, igual que en TS.
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

RefreshType = Literal["full", "dataOnly", "calculate"]
RunStatus = Literal["Completed", "Failed", "InProgress"]


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


# --- Frecuencia: unión discriminada por `kind` ---


class DailyFrequency(CamelModel):
    kind: Literal["daily"]
    time: str  # "HH:mm"


class HourlyFrequency(CamelModel):
    kind: Literal["hourly"]
    every_hours: int


class WeeklyFrequency(CamelModel):
    kind: Literal["weekly"]
    # 0=Domingo .. 6=Sábado (la UI los muestra empezando por Lunes).
    days_of_week: list[int]
    time: str  # "HH:mm"


class MonthlyFrequency(CamelModel):
    kind: Literal["monthly"]
    # 1..28, o -1 ("último día del mes"). Ver frequency.schedule_time.
    day_of_month: int
    time: str  # "HH:mm"


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


# --- Inputs de mutación (el cliente no manda id/time/lastRun) ---


class CreateScheduleInput(CamelModel):
    dataset_id: str
    workspace_id: str
    tables: list[str]
    frequency: Frequency
    refresh_type: RefreshType
    enabled: bool


class UpdateScheduleInput(CamelModel):
    # Todos opcionales: es un PATCH parcial. (lastRun se omite a propósito; igual
    # que el mock, no se toca el último run desde acá.)
    tables: Optional[list[str]] = None
    frequency: Optional[Frequency] = None
    refresh_type: Optional[RefreshType] = None
    enabled: Optional[bool] = None


class SetEnabledInput(CamelModel):
    enabled: bool


class ScheduleMutationResult(CamelModel):
    # El schedule creado o actualizado; None si fue eliminado.
    affected: Optional[Schedule] = None
    # Lista COMPLETA y actualizada de tablas del dataset, con scheduleId sincronizado.
    tables: list[TableInfo]
