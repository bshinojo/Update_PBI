# App FastAPI. Sirve SOLO la API (el frontend lo sirve nginx como build estático).
# El router se monta sin prefijo: en producción nginx hace proxy de /api/ -> backend/
# (ver backend/README.md). En dev podés apuntar el frontend a http://localhost:8000.
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .dependencies import get_scheduler
from .routes import router

settings = get_settings()


def _configure_logging() -> None:
    # uvicorn solo configura sus propios loggers; nuestros loggers "pbi.*" propagan
    # al root (sin handler) y sus INFO no se ven. Les damos un handler propio a stdout
    # para que el scheduler/executor/powerbi registren lo que hacen (disparos, estado
    # de los refreshes, etc.). Idempotente: no duplica handlers entre reloads.
    pbi = logging.getLogger("pbi")
    if not pbi.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
        pbi.addHandler(handler)
        pbi.propagate = False
    pbi.setLevel(settings.log_level.upper())


_configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Arranca el worker del scheduler junto con la API (mismo proceso -> store
    # compartido). Se puede apagar con PBI_SCHEDULER_ENABLED=0.
    scheduler = get_scheduler()
    if settings.scheduler_enabled:
        scheduler.start()
    try:
        yield
    finally:
        scheduler.stop()


app = FastAPI(
    title="PBI Refresh Scheduler API",
    version="0.1.0",
    description="Backend de la herramienta de refreshes selectivos de Power BI.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(router)
