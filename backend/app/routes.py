# Los endpoints del contrato ScheduleApi (ver src/api/client.ts y CLAUDE.md §6.A).
# Las respuestas salen en camelCase (alias) para que HttpScheduleApi no mapee nada.
# response_model_exclude_none: omitimos los campos None (scheduleId, lastRun, affected,
# nextRunAt) para que los opcionales de TS (`?`) vayan ausentes cuando no aplican.
# El front los trata por truthiness en ambos casos.
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from .config import get_settings
from .datasource import DataSource, TablesUnavailableError
from .dependencies import get_datasource, get_runlog, get_scheduler, get_store
from .nextrun import art_tz, display_next_run
from .runlog import RunLogger
from .scheduler import AlreadyRunningError, Scheduler
from .models import (
    CreateScheduleInput,
    Dataset,
    Report,
    ReportRun,
    RunRecord,
    Schedule,
    ScheduleCounts,
    ScheduleMutationResult,
    SetEnabledInput,
    TableInfo,
    UpdateScheduleInput,
    Workspace,
)
from .store import NotFoundError, ScheduleStore

logger = logging.getLogger("pbi.routes")

router = APIRouter()

_TZ = art_tz(get_settings().tz_offset_hours)


def _with_next_run(schedule: Schedule | None) -> Schedule | None:
    """Deriva next_run_at (campo de SOLO respuesta) sobre la copia que devuelve el
    store. El dato se recalcula en cada request: nunca se persiste ni queda viejo."""
    if schedule is not None:
        schedule.next_run_at = display_next_run(schedule, datetime.now(_TZ))
    return schedule


def _result_with_next_run(result: ScheduleMutationResult) -> ScheduleMutationResult:
    _with_next_run(result.affected)
    return result


def _resolve_names(ds: DataSource, runs: list[dict]) -> None:
    """Completa `workspaceName`/`datasetName` en cada run del informe (in place,
    best-effort). El historial en disco guarda solo ids; los nombres se resuelven acá,
    que es el único lugar con acceso a Power BI. Si la lectura falla (red/RLS/permisos),
    se deja el campo ausente y el front cae al id — el informe nunca rompe por esto."""
    if not runs:
        return
    ws_names: dict[str, str] = {}
    try:
        for w in ds.list_workspaces():
            ws_names[w.id] = w.name
    except Exception:  # noqa: BLE001 - resolver nombres es decorativo, nunca crítico
        logger.exception("No se pudieron resolver nombres de workspace para el informe")
    ds_names: dict[str, str] = {}
    for ws_id in {r.get("workspaceId") for r in runs if r.get("workspaceId")}:
        try:
            for d in ds.list_datasets(ws_id):
                ds_names[d.id] = d.name
        except Exception:  # noqa: BLE001
            logger.exception("No se pudieron resolver nombres de modelo del workspace %s", ws_id)
    for r in runs:
        if ws_names.get(r.get("workspaceId")):
            r["workspaceName"] = ws_names[r["workspaceId"]]
        if ds_names.get(r.get("datasetId")):
            r["datasetName"] = ds_names[r["datasetId"]]


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
    return [_with_next_run(s) for s in store.list_schedules(dataset_id)]


@router.get(
    "/schedules/{schedule_id}/runs",
    response_model=list[RunRecord],
    response_model_exclude_none=True,
)
def list_schedule_runs(
    schedule_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    runlog: RunLogger = Depends(get_runlog),
):
    """Historial de corridas TERMINADAS de un schedule (la más reciente primero),
    leído de runs.jsonl. Devuelve [] si nunca corrió (o si el historial está
    desactivado). Las líneas con formato viejo/ilegible se saltean."""
    out: list[RunRecord] = []
    for rec in runlog.tail(schedule_id, limit=limit):
        try:
            out.append(RunRecord.model_validate(rec))
        except ValueError:
            continue  # línea de una versión vieja del log: mejor saltearla que romper
    return out


@router.get("/report", response_model=Report, response_model_exclude_none=True)
def get_report(
    limit: int = Query(default=50, ge=1, le=200),
    store: ScheduleStore = Depends(get_store),
    runlog: RunLogger = Depends(get_runlog),
    scheduler: Scheduler = Depends(get_scheduler),
    ds: DataSource = Depends(get_datasource),
):
    """Informe global de la vista --INFORME--: contadores de programaciones (total /
    activas / en pausa) + las últimas `limit` actualizaciones, las EN CURSO primero
    (del scheduler, en memoria) y luego el HISTORIAL terminado (runs.jsonl), ordenadas
    por fecha desc. Cada fila trae el nombre legible de workspace/modelo (best-effort)."""
    schedules = store.all_schedules()
    active = sum(1 for s in schedules if s.enabled)
    counts = ScheduleCounts(total=len(schedules), active=active, paused=len(schedules) - active)

    # En curso (memoria) + historial terminado (disco), más recientes primero. Las En
    # curso no tienen finishedAt, así que el sort cae a startedAt: quedan arriba.
    merged = scheduler.current_runs() + runlog.tail_all(limit=limit)
    merged.sort(key=lambda r: r.get("finishedAt") or r.get("startedAt") or "", reverse=True)
    merged = merged[:limit]

    _resolve_names(ds, merged)

    runs: list[ReportRun] = []
    for rec in merged:
        try:
            runs.append(ReportRun.model_validate(rec))
        except ValueError:
            continue  # línea de una versión vieja del log: saltearla, no romper
    return Report(schedules=counts, runs=runs)


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
    return _result_with_next_run(store.create(body))


@router.patch(
    "/schedules/{schedule_id}",
    response_model=ScheduleMutationResult,
    response_model_exclude_none=True,
)
def update_schedule(schedule_id: str, body: UpdateScheduleInput,
                    store: ScheduleStore = Depends(get_store),
                    ds: DataSource = Depends(get_datasource)):
    # Si el PATCH cambia las tablas (la UI permite editar la membresía), validamos
    # que existan en el modelo, igual que en el alta. Si no se pueden leer (RLS),
    # no bloqueamos.
    if body.tables is not None:
        try:
            sch = store.get(schedule_id)
        except NotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        try:
            known = {t.name for t in ds.list_tables(sch.dataset_id)}
        except TablesUnavailableError:
            known = None
        if known is not None:
            missing = [t for t in body.tables if t not in known]
            if missing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Estas tablas no existen en el modelo: {', '.join(missing)}.",
                )
    try:
        return _result_with_next_run(store.update(schedule_id, body))
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
        return _result_with_next_run(store.set_enabled(schedule_id, body.enabled))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete(
    "/schedules/{schedule_id}",
    response_model=ScheduleMutationResult,
    response_model_exclude_none=True,
)
def delete_schedule(schedule_id: str, store: ScheduleStore = Depends(get_store)):
    try:
        return store.delete(schedule_id)  # affected=None: no hay next_run que derivar
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
    return ScheduleMutationResult(affected=_with_next_run(affected), tables=tables)
