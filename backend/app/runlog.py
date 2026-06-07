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


class NullRunLog:
    """No-op (para tests o si se quiere desactivar el historial)."""

    def append(self, record: dict) -> None:
        pass
