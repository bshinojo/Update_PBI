# Historial de corridas (audit log) en formato JSON Lines: una línea por refresh
# que terminó, con su desenlace. A diferencia de `lastRun` (que guarda solo el
# ÚLTIMO run por schedule en schedules.json), esto es un HISTÓRICO append-only.
#
# Blindado: cualquier falla al escribir se loguea y se traga — NUNCA propaga una
# excepción, así un problema de disco no corta el tick del scheduler ni el refresh.
import json
import logging
import threading
from pathlib import Path
from typing import Protocol

logger = logging.getLogger("pbi.runlog")


class RunLogger(Protocol):
    def append(self, record: dict) -> None: ...
    def tail(self, schedule_id: str, limit: int = 20) -> list[dict]: ...
    def tail_all(self, limit: int = 50) -> list[dict]: ...


class RunLog:
    """Escribe records de corridas como JSON Lines (append-only, thread-safe)."""

    def __init__(self, path: str) -> None:
        self._path = Path(path)
        self._lock = threading.Lock()

    def append(self, record: dict) -> None:
        try:
            line = json.dumps(record, ensure_ascii=False)
            with self._lock:
                with self._path.open("a", encoding="utf-8") as f:
                    f.write(line + "\n")
        except Exception:  # noqa: BLE001 - el log NUNCA debe romper el scheduler
            logger.exception("No se pudo escribir el run log en %s", self._path)

    def tail(self, schedule_id: str, limit: int = 20) -> list[dict]:
        """Últimas `limit` corridas de un schedule, la más reciente primero. Lee el
        archivo entero (a esta escala alcanza); las líneas ilegibles se saltean."""
        out: list[dict] = []
        try:
            with self._lock:
                if not self._path.exists():
                    return []
                lines = self._path.read_text(encoding="utf-8").splitlines()
        except Exception:  # noqa: BLE001 - leer el historial nunca debe tirar la API
            logger.exception("No se pudo leer el run log en %s", self._path)
            return []
        for line in lines:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(rec, dict) and rec.get("scheduleId") == schedule_id:
                out.append(rec)
        return out[-limit:][::-1]

    def tail_all(self, limit: int = 50) -> list[dict]:
        """Últimas `limit` corridas de TODOS los schedules, la más reciente primero
        (orden por finishedAt, con fallback a startedAt). Alimenta el informe global.
        Lee el archivo entero (a esta escala alcanza); las líneas ilegibles se saltean."""
        try:
            with self._lock:
                if not self._path.exists():
                    return []
                lines = self._path.read_text(encoding="utf-8").splitlines()
        except Exception:  # noqa: BLE001 - leer el historial nunca debe tirar la API
            logger.exception("No se pudo leer el run log en %s", self._path)
            return []
        recs: list[dict] = []
        for line in lines:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(rec, dict):
                recs.append(rec)
        recs.sort(key=lambda r: r.get("finishedAt") or r.get("startedAt") or "", reverse=True)
        return recs[:limit]


class NullRunLog:
    """No-op (para tests o si se quiere desactivar el historial)."""

    def append(self, record: dict) -> None:
        pass

    def tail(self, schedule_id: str, limit: int = 20) -> list[dict]:
        return []

    def tail_all(self, limit: int = 50) -> list[dict]:
        return []
