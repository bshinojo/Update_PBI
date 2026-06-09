# Los 8 endpoints del contrato ScheduleApi (ver src/api/client.ts y CLAUDE.md §6.A).
# Las respuestas salen en camelCase (alias) para que HttpScheduleApi no mapee nada.
# response_model_exclude_none: omitimos los campos None (scheduleId, lastRun, affected)
# para que el JSON sea idéntico al del mock, donde esos campos son opcionales (TS `?`)
# y van ausentes cuando no aplican. El front los trata por truthiness en ambos casos.
from fastapi import APIRouter, Depends, HTTPException

from .datasource import DataSource, TablesUnavailableError
from .dependencies import get_datasource, get_scheduler, get_store
from .scheduler import AlreadyRunningError, Scheduler
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
    try:
        return store.list_tables(dataset_id)
    except TablesUnavailableError as e:
        # 502: la lectura falló del lado de Power BI (p. ej. RLS). El front muestra
        # `detail` en su estado de error, en vez del falso "el modelo no tiene tablas".
        raise HTTPException(status_code=502, detail=e.detail)


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
def create_schedule(
    body: CreateScheduleInput,
    store: ScheduleStore = Depends(get_store),
    ds: DataSource = Depends(get_datasource),
):
    # Validamos que las tablas existan en el modelo: si no, el schedule se crearía
    # igual pero después el refresh fallaría siempre (Power BI rechaza tablas que no
    # existen). Si las tablas no se pueden leer (RLS), no bloqueamos: no hay forma
    # de verificar y el usuario las eligió desde la UI.
    try:
        known = {t.name for t in ds.list_tables(body.dataset_id)}
    except TablesUnavailableError:
        known = None
    if known is not None:
        missing = [t for t in body.tables if t not in known]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Estas tablas no existen en el modelo: {', '.join(missing)}.",
            )
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


@router.post(
    "/schedules/{schedule_id}/run",
    response_model=ScheduleMutationResult,
    response_model_exclude_none=True,
)
def run_schedule_now(
    schedule_id: str,
    store: ScheduleStore = Depends(get_store),
    scheduler: Scheduler = Depends(get_scheduler),
):
    """Dispara el refresh del schedule YA, fuera de su horario (botón "Ejecutar
    ahora"). Devuelve el mismo shape que las demás mutaciones: el schedule con su
    lastRun nuevo (InProgress, o terminal si el disparo se resolvió al instante)."""
    if not scheduler.is_running:
        # Sin el hilo del scheduler nadie pollearía el refresh: quedaría InProgress
        # para siempre. Mejor rechazar con un mensaje claro.
        raise HTTPException(
            status_code=503,
            detail="El scheduler no está corriendo; no se puede ejecutar a demanda.",
        )
    try:
        scheduler.run_now(schedule_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except AlreadyRunningError as e:
        raise HTTPException(status_code=409, detail=e.detail)
    affected = store.get(schedule_id)
    try:
        tables = store.list_tables(affected.dataset_id)
    except TablesUnavailableError:
        # El refresh YA se disparó; solo falló releer las tablas (p. ej. RLS con el
        # cache del scanner vencido). El polling del front va a reflejar el estado.
        raise HTTPException(
            status_code=502,
            detail="El refresh se disparó, pero no se pudieron releer las tablas; "
            "el estado se va a actualizar solo en unos segundos.",
        )
    return ScheduleMutationResult(affected=affected, tables=tables)
