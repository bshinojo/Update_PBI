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
from .store import ScheduleStore

logger = logging.getLogger("pbi.scheduler")


@dataclass
class _Pending:
    """Un refresh disparado que sigue en curso y hay que pollear."""
    token: str
    started_at: datetime
    schedule: Schedule  # snapshot: alcanza para pollear aunque cambie/pause en el store


class Scheduler:
    def __init__(self, store: ScheduleStore, executor: RefreshExecutor, settings: Settings) -> None:
        self._store = store
        self._executor = executor
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
            ref = self._reference(sch, now)
            if next_run_at(sch.frequency, ref) <= now:
                out.append(sch)
        return out

    def tick(self, now: datetime | None = None) -> list[str]:
        """Dispara los schedules vencidos a `now` y pollea los refreshes en vuelo.
        Devuelve los ids disparados en este tick. Un schedule con un refresh ya en
        curso no se vuelve a disparar hasta que ese refresh termine."""
        now = now or self.now()
        fired: list[str] = []
        for sch in self.due_schedules(now):
            if sch.id in self._pending:
                continue  # ya hay un refresh en vuelo para este schedule
            self._fire(sch, now)
            fired.append(sch.id)
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
            return
        if token is None:
            # Resultado inmediato (seed instantáneo, o sin id para pollear).
            self._store.set_last_run(sch.id, LastRun(status="Completed", timestamp=ts))
            logger.info("Schedule %s disparado -> Completed", sch.id)
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
            ok = self._store.set_last_run(sid, LastRun(status=status, timestamp=now.isoformat(timespec="seconds")))
            self._pending.pop(sid, None)
            if ok:
                logger.info("Schedule %s refresh -> %s", sid, status)

    def _gc_anchors(self) -> None:
        alive = {s.id for s in self._store.all_enabled_schedules()}
        for sid in list(self._anchors):
            if sid not in alive:
                self._anchors.pop(sid, None)

    # --- Loop en segundo plano ---

    def start(self) -> None:
        if self._thread is not None:
            return
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
