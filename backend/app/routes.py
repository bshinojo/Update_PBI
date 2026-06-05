# Los 8 endpoints del contrato ScheduleApi (ver src/api/client.ts y CLAUDE.md §6.A).
# Las respuestas salen en camelCase (alias) para que HttpScheduleApi no mapee nada.
# response_model_exclude_none: omitimos los campos None (scheduleId, lastRun, affected)
# para que el JSON sea idéntico al del mock, donde esos campos son opcionales (TS `?`)
# y van ausentes cuando no aplican. El front los trata por truthiness en ambos casos.
from fastapi import APIRouter, Depends, HTTPException

from .datasource import DataSource
from .dependencies import get_datasource, get_store
from .models import (
    CreateScheduleInput,
    Dataset,
    Schedule,
    ScheduleMutationResult,
    SetEnabledInput,
    TableInfo,
    UpdateScheduleInput,
    Workspace,
)
from .store import NotFoundError, ScheduleStore

router = APIRouter()


@router.get("/workspaces", response_model=list[Workspace])
def list_workspaces(ds: DataSource = Depends(get_datasource)):
    return ds.list_workspaces()


@router.get("/workspaces/{workspace_id}/datasets", response_model=list[Dataset])
def list_datasets(workspace_id: str, ds: DataSource = Depends(get_datasource)):
    return ds.list_datasets(workspace_id)


@router.get(
    "/datasets/{dataset_id}/tables",
    response_model=list[TableInfo],
    response_model_exclude_none=True,
)
def list_tables(dataset_id: str, store: ScheduleStore = Depends(get_store)):
    return store.list_tables(dataset_id)


@router.get(
    "/datasets/{dataset_id}/schedules",
    response_model=list[Schedule],
    response_model_exclude_none=True,
)
def list_schedules(dataset_id: str, store: ScheduleStore = Depends(get_store)):
    return store.list_schedules(dataset_id)


@router.post(
    "/schedules",
    response_model=ScheduleMutationResult,
    response_model_exclude_none=True,
)
def create_schedule(body: CreateScheduleInput, store: ScheduleStore = Depends(get_store)):
    return store.create(body)


@router.patch(
    "/schedules/{schedule_id}",
    response_model=ScheduleMutationResult,
    response_model_exclude_none=True,
)
def update_schedule(schedule_id: str, body: UpdateScheduleInput,
                    store: ScheduleStore = Depends(get_store)):
    try:
        return store.update(schedule_id, body)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put(
    "/schedules/{schedule_id}/enabled",
    response_model=ScheduleMutationResult,
    response_model_exclude_none=True,
)
def set_enabled(schedule_id: str, body: SetEnabledInput,
                store: ScheduleStore = Depends(get_store)):
    try:
        return store.set_enabled(schedule_id, body.enabled)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete(
    "/schedules/{schedule_id}",
    response_model=ScheduleMutationResult,
    response_model_exclude_none=True,
)
def delete_schedule(schedule_id: str, store: ScheduleStore = Depends(get_store)):
    try:
        return store.delete(schedule_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
