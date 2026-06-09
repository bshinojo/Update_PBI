# Worker que dispara los schedules a su hora (etapa B). Corre en un hilo daemon
# dentro del MISMO proceso que la API, así comparte el store en memoria (el lock
# del store hace segura la concurrencia con los handlers HTTP). Por eso conviene
# correr uvicorn con UN solo worker (ver backend/README.md).
#
# Diseño para testear: toda la decisión vive en tick(now) (puro respecto del reloj);
# el hilo solo llama tick() en loop con sleeps. Así se prueba con un reloj fijo y un
# executor falso, sin esperar tiempo real ni tener credenciales.
import logging
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta

from .config import Settings
from .executor import RefreshExecutor
from .models import LastRun, Schedule
from .nextrun import art_tz, next_run_at
from .runlog import NullRunLog, RunLogger
from .store import ScheduleStore

logger = logging.getLogger("pbi.scheduler")


@dataclass
class _Pending:
    """Un refresh disparado que sigue en curso y hay que pollear."""
    token: str
    started_at: datetime
    schedule: Schedule  # snapshot: alcanza para pollear aunque cambie/pause en el store


class Scheduler:
    def __init__(
        self,
        store: ScheduleStore,
        executor: RefreshExecutor,
        settings: Settings,
        runlog: RunLogger | None = None,
    ) -> None:
        self._store = store
        self._executor = executor
        self._runlog = runlog or NullRunLog()
        self._tz = art_tz(settings.tz_offset_hours)
        self._tick_seconds = settings.scheduler_tick_seconds
        self._poll_timeout = timedelta(minutes=settings.refresh_poll_timeout_min)
        # Ancla por schedule: punto de referencia para calcular el próximo disparo
        # cuando el schedule todavía no tiene lastRun. Se fija la primera vez que el
        # scheduler "ve" el schedule, así no dispara retroactivamente al arrancar.
        self._anchors: dict[str, datetime] = {}
        # Refreshes en vuelo (scheduleId -> pendiente), para resolver InProgress.
        self._pending: dict[str, _Pending] = {}
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()

    def now(self) -> datetime:
        return datetime.now(self._tz)

    # --- Decisión (pura respecto del reloj) ---

    def _reference(self, sch: Schedule, now: datetime) -> datetime:
        """Desde cuándo calcular el próximo disparo de este schedule."""
        if sch.last_run is not None:
            try:
                ref = datetime.fromisoformat(sch.last_run.timestamp)
                if ref.tzinfo is None:
                    ref = ref.replace(tzinfo=self._tz)
                return ref.astimezone(self._tz)
            except ValueError:
                pass
        # Sin lastRun: anclamos a la primera vez que lo vemos (no dispara hacia atrás).
        return self._anchors.setdefault(sch.id, now)

    def due_schedules(self, now: datetime) -> list[Schedule]:
        out: list[Schedule] = []
        for sch in self._store.all_enabled_schedules():
            # Aislamos cada schedule: si uno tiene una frecuencia corrupta (p. ej.
            # persistida a mano o de una versión vieja sin validación) y next_run_at
            # explota, lo salteamos y seguimos con el resto, en vez de que el error
            # mate el tick entero y deje de correr TODOS los schedules.
            try:
                ref = self._reference(sch, now)
                if next_run_at(sch.frequency, ref) <= now:
                    out.append(sch)
            except Exception:  # noqa: BLE001 - un schedule roto no debe frenar a los demás
                logger.exception("No se pudo calcular la próxima corrida del schedule %s", sch.id)
        return out

    def reconcile_orphans(self, now: datetime | None = None) -> list[str]:
        """Al arrancar, resuelve los refreshes que quedaron 'InProgress' en disco tras
        un reinicio del proceso. El dict de pendientes vive en memoria, así que un
        refresh que estaba en vuelo cuando el proceso murió no se puede pollear: su
        token se perdió. En vez de dejarlo InProgress para siempre (spinner eterno en
        la UI), lo marcamos Failed. Devuelve los ids reconciliados."""
        now = now or self.now()
        ts = now.isoformat(timespec="seconds")
        reconciled: list[str] = []
        for sch in self._store.all_schedules():
            if sch.id in self._pending:
                continue  # tiene un pendiente vivo en esta instancia (no es huérfano)
            if sch.last_run is not None and sch.last_run.status == "InProgress":
                self._store.set_last_run(sch.id, LastRun(status="Failed", timestamp=ts))
                self._record_run(sch, "Failed", refresh_id=None, started_at=ts, finished_at=ts)
                reconciled.append(sch.id)
                logger.warning(
                    "Schedule %s quedó InProgress tras un reinicio -> marcado Failed", sch.id,
                )
        return reconciled

    def tick(self, now: datetime | None = None) -> list[str]:
        """Dispara los schedules vencidos a `now` y pollea los refreshes en vuelo.
        Devuelve los ids disparados en este tick. Un schedule con un refresh ya en
        curso no se vuelve a disparar hasta que ese refresh termine; y como Power BI
        no permite dos refreshes concurrentes sobre el MISMO dataset, si el dataset ya
        tiene uno en vuelo el disparo se DIFIERE al próximo tick (se evita el Failed
        espurio por colisión)."""
        now = now or self.now()
        fired: list[str] = []
        # Datasets con un refresh en vuelo (de ticks anteriores).
        busy_datasets = {p.schedule.dataset_id for p in self._pending.values()}
        for sch in self.due_schedules(now):
            if sch.id in self._pending:
                continue  # este schedule ya tiene un refresh en vuelo
            if sch.dataset_id in busy_datasets:
                logger.info(
                    "Schedule %s diferido: el dataset %s ya tiene un refresh en curso",
                    sch.id, sch.dataset_id,
                )
                continue  # otro schedule del mismo dataset corre -> reintenta próximo tick
            self._fire(sch, now)
            fired.append(sch.id)
            # Si quedó async en vuelo, el dataset queda ocupado también para este tick
            # (dos schedules del mismo dataset vencidos a la vez no colisionan).
            if sch.id in self._pending:
                busy_datasets.add(sch.dataset_id)
        self._poll_pending(now)
        self._gc_anchors()
        return fired

    def _fire(self, sch: Schedule, now: datetime) -> None:
        ts = now.isoformat(timespec="seconds")
        # Marcamos "En curso" antes de disparar.
        self._store.set_last_run(sch.id, LastRun(status="InProgress", timestamp=ts))
        try:
            token = self._executor.start(sch)
        except Exception:  # noqa: BLE001 - una falla al disparar se registra como Failed
            logger.exception("Falló el disparo del schedule %s", sch.id)
            self._store.set_last_run(sch.id, LastRun(status="Failed", timestamp=ts))
            self._record_run(sch, "Failed", refresh_id=None, started_at=ts, finished_at=ts)
            return
        if token is None:
            # Resultado inmediato (Power BI no informó un id para pollear).
            self._store.set_last_run(sch.id, LastRun(status="Completed", timestamp=ts))
            logger.info("Schedule %s disparado -> Completed", sch.id)
            self._record_run(sch, "Completed", refresh_id=None, started_at=ts, finished_at=ts)
        else:
            # Asíncrono: queda InProgress; lo resolverá el polling en próximos ticks.
            self._pending[sch.id] = _Pending(token=token, started_at=now, schedule=sch)
            logger.info("Schedule %s disparado -> InProgress (refresh %s)", sch.id, token)

    def _poll_pending(self, now: datetime) -> None:
        """Consulta el estado de cada refresh en vuelo y resuelve InProgress ->
        Completed/Failed. Aplica el timeout y descarta los de schedules borrados."""
        for sid, pend in list(self._pending.items()):
            try:
                status = self._executor.poll(pend.schedule, pend.token)
            except Exception:  # noqa: BLE001 - falla del polling -> Failed
                logger.exception("Falló el polling del schedule %s", sid)
                status = "Failed"
            if status == "InProgress":
                if now - pend.started_at <= self._poll_timeout:
                    continue  # sigue corriendo, esperamos al próximo tick
                logger.warning("Refresh del schedule %s excedió el timeout -> Failed", sid)
                status = "Failed"
            # Estado terminal: registramos y dejamos de pollear. set_last_run devuelve
            # False si el schedule se borró mientras corría (lo descartamos igual).
            finished = now.isoformat(timespec="seconds")
            ok = self._store.set_last_run(sid, LastRun(status=status, timestamp=finished))
            self._pending.pop(sid, None)
            self._record_run(
                pend.schedule, status, refresh_id=pend.token,
                started_at=pend.started_at.isoformat(timespec="seconds"), finished_at=finished,
            )
            if ok:
                logger.info("Schedule %s refresh -> %s", sid, status)

    def _record_run(
        self, sch: Schedule, status: str, refresh_id: str | None,
        started_at: str, finished_at: str,
    ) -> None:
        """Anexa una línea al historial de corridas (audit log). El RunLog está
        blindado: si falla escribir, no propaga (no corta el scheduler)."""
        self._runlog.append({
            "scheduleId": sch.id,
            "datasetId": sch.dataset_id,
            "workspaceId": sch.workspace_id,
            "tables": list(sch.tables),
            "refreshType": sch.refresh_type,
            "refreshId": refresh_id,
            "status": status,
            "startedAt": started_at,
            "finishedAt": finished_at,
        })

    def _gc_anchors(self) -> None:
        alive = {s.id for s in self._store.all_enabled_schedules()}
        for sid in list(self._anchors):
            if sid not in alive:
                self._anchors.pop(sid, None)

    # --- Loop en segundo plano ---

    def start(self) -> None:
        if self._thread is not None:
            return
        # Antes de arrancar el loop: limpiar refreshes que quedaron InProgress de una
        # corrida anterior del proceso (no se pueden pollear, su token se perdió).
        self.reconcile_orphans()
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, name="pbi-scheduler", daemon=True)
        self._thread.start()
        logger.info("Scheduler iniciado (tick=%ss, tz=%s)", self._tick_seconds, self._tz)

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                self.tick()
            except Exception:  # noqa: BLE001 - un error de un tick no debe matar el worker
                logger.exception("Error en el tick del scheduler")
            self._stop.wait(self._tick_seconds)

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
            self._thread = None
        logger.info("Scheduler detenido")
