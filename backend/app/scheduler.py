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

_ERROR_TEXT_MAX = 300


def _short_error(e: Exception) -> str:
    """Texto corto y legible de una excepción, para lastRun.error / el historial."""
    msg = str(e).strip() or type(e).__name__
    return msg[:_ERROR_TEXT_MAX]


class AlreadyRunningError(Exception):
    """No se puede disparar ahora: ya hay un refresh en curso (del mismo schedule o
    de otro schedule sobre el mismo dataset). Se mapea a HTTP 409 en las rutas."""

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


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
        # Serializa tick() (hilo del scheduler) con run_now() (handlers HTTP): ambos
        # leen/escriben _pending y disparan refreshes, así que no pueden solaparse.
        self._op_lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        # Marca de tiempo del último tick que corrió (lo escribe el loop). Sirve para
        # el health check: si el hilo se cuelga, este valor deja de avanzar.
        self._last_tick_at: datetime | None = None

    def now(self) -> datetime:
        return datetime.now(self._tz)

    def health(self) -> dict:
        """Estado del worker para `GET /health`. `healthy` es False si el hilo no
        corre o si el último tick quedó viejo (el loop se colgó): pasado ~2 ticks
        sin avanzar, algo anda mal y conviene alertar/reiniciar."""
        last = self._last_tick_at
        fresh = last is not None and (
            (self.now() - last).total_seconds() <= self._tick_seconds * 2 + 5
        )
        return {
            "running": self.is_running,
            "lastTickAt": last.isoformat(timespec="seconds") if last else None,
            "healthy": self.is_running and fresh,
        }


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
        reason = "El servidor se reinició mientras la actualización estaba en curso."
        for sch in self._store.all_schedules():
            if sch.id in self._pending:
                continue  # tiene un pendiente vivo en esta instancia (no es huérfano)
            if sch.last_run is not None and sch.last_run.status == "InProgress":
                self._store.set_last_run(
                    sch.id, LastRun(status="Failed", timestamp=ts, error=reason)
                )
                self._record_run(
                    sch, "Failed", refresh_id=None, started_at=ts, finished_at=ts,
                    error=reason,
                )
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
        with self._op_lock:
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

    def run_now(self, schedule_id: str, now: datetime | None = None) -> None:
        """Dispara un schedule A DEMANDA (botón "Ejecutar ahora"), fuera de su horario.
        Corre aunque el schedule esté pausado: "Habilitado" gobierna la programación
        automática; la ejecución manual es una decisión explícita del usuario.
        Lanza NotFoundError si no existe y AlreadyRunningError si ese schedule (u otro
        del mismo dataset) ya tiene un refresh en vuelo. El polling del scheduler
        resuelve el InProgress como con cualquier disparo."""
        now = now or self.now()
        sch = self._store.get(schedule_id)  # NotFoundError si no existe
        with self._op_lock:
            if sch.id in self._pending:
                raise AlreadyRunningError("Esta programación ya tiene un refresh en curso.")
            if any(p.schedule.dataset_id == sch.dataset_id for p in self._pending.values()):
                raise AlreadyRunningError(
                    "El modelo ya tiene un refresh en curso; esperá a que termine.",
                )
            logger.info("Schedule %s disparado a demanda (Ejecutar ahora)", sch.id)
            self._fire(sch, now)

    @property
    def is_running(self) -> bool:
        """True si el hilo del scheduler está corriendo (sin él, un disparo asíncrono
        nunca se pollearía y quedaría InProgress)."""
        return self._thread is not None

    def _fire(self, sch: Schedule, now: datetime) -> None:
        ts = now.isoformat(timespec="seconds")
        # Marcamos "En curso" antes de disparar.
        self._store.set_last_run(sch.id, LastRun(status="InProgress", timestamp=ts))
        try:
            token = self._executor.start(sch)
        except Exception as e:  # noqa: BLE001 - una falla al disparar se registra como Failed
            logger.exception("Falló el disparo del schedule %s", sch.id)
            error = _short_error(e)
            self._store.set_last_run(
                sch.id, LastRun(status="Failed", timestamp=ts, error=error)
            )
            self._record_run(
                sch, "Failed", refresh_id=None, started_at=ts, finished_at=ts, error=error,
            )
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
            error: str | None = None
            try:
                status, error = self._executor.poll(pend.schedule, pend.token)
            except Exception as e:  # noqa: BLE001 - falla del polling -> Failed
                logger.exception("Falló el polling del schedule %s", sid)
                status = "Failed"
                error = _short_error(e)
            if status == "InProgress":
                if now - pend.started_at <= self._poll_timeout:
                    continue  # sigue corriendo, esperamos al próximo tick
                logger.warning("Refresh del schedule %s excedió el timeout -> Failed", sid)
                status = "Failed"
                minutes = int(self._poll_timeout.total_seconds() // 60)
                error = f"La actualización superó el tiempo máximo de espera ({minutes} min)."
            if status != "Failed":
                error = None
            # Estado terminal: registramos y dejamos de pollear. set_last_run devuelve
            # False si el schedule se borró mientras corría (lo descartamos igual).
            finished = now.isoformat(timespec="seconds")
            ok = self._store.set_last_run(
                sid, LastRun(status=status, timestamp=finished, error=error)
            )
            self._pending.pop(sid, None)
            self._record_run(
                pend.schedule, status, refresh_id=pend.token,
                started_at=pend.started_at.isoformat(timespec="seconds"), finished_at=finished,
                error=error,
            )
            if ok:
                logger.info("Schedule %s refresh -> %s", sid, status)

    def _record_run(
        self, sch: Schedule, status: str, refresh_id: str | None,
        started_at: str, finished_at: str, error: str | None = None,
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
            "error": error,
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
                self._last_tick_at = self.now()  # marca de salud: el loop avanza
            except Exception:  # noqa: BLE001 - un error de un tick no debe matar el worker
                logger.exception("Error en el tick del scheduler")
            self._stop.wait(self._tick_seconds)

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
            self._thread = None
        logger.info("Scheduler detenido")
