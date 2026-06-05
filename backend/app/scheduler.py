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
from datetime import datetime

from .config import Settings
from .executor import RefreshExecutor
from .models import LastRun, Schedule
from .nextrun import art_tz, next_run_at
from .store import ScheduleStore

logger = logging.getLogger("pbi.scheduler")


class Scheduler:
    def __init__(self, store: ScheduleStore, executor: RefreshExecutor, settings: Settings) -> None:
        self._store = store
        self._executor = executor
        self._tz = art_tz(settings.tz_offset_hours)
        self._tick_seconds = settings.scheduler_tick_seconds
        # Ancla por schedule: punto de referencia para calcular el próximo disparo
        # cuando el schedule todavía no tiene lastRun. Se fija la primera vez que el
        # scheduler "ve" el schedule, así no dispara retroactivamente al arrancar.
        self._anchors: dict[str, datetime] = {}
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
        """Dispara todos los schedules vencidos a `now`. Devuelve los ids disparados.
        Limpia anclas de schedules que ya no existen para no acumular memoria."""
        now = now or self.now()
        fired: list[str] = []
        for sch in self.due_schedules(now):
            self._fire(sch, now)
            fired.append(sch.id)
        self._gc_anchors()
        return fired

    def _fire(self, sch: Schedule, now: datetime) -> None:
        ts = now.isoformat(timespec="seconds")
        # Marcamos "En curso" antes de disparar (visible en refreshes reales/async).
        self._store.set_last_run(sch.id, LastRun(status="InProgress", timestamp=ts))
        try:
            self._executor.run(sch)
            status = "Completed"
        except Exception:  # noqa: BLE001 - cualquier falla del refresh se registra como Failed
            logger.exception("Falló el refresh del schedule %s", sch.id)
            status = "Failed"
        # Si el schedule se borró mientras corría, set_last_run devuelve False y listo.
        self._store.set_last_run(sch.id, LastRun(status=status, timestamp=now.isoformat(timespec="seconds")))
        logger.info("Schedule %s disparado -> %s", sch.id, status)

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
