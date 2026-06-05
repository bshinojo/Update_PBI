# App FastAPI. Sirve SOLO la API (el frontend lo sirve nginx como build estático).
# El router se monta sin prefijo: en producción nginx hace proxy de /api/ -> backend/
# (ver backend/README.md). En dev podés apuntar el frontend a http://localhost:8000.
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .dependencies import get_scheduler
from .routes import router

settings = get_settings()


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
    return {"status": "ok", "dataSource": settings.data_source}


app.include_router(router)
