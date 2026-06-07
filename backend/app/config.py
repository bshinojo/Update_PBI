# Configuración del backend. TODAS las opciones se leen de variables de entorno
# (o de un archivo `.env` en backend/), con el prefijo PBI_. Cambiar credenciales
# o de modo de datos es editar el .env y reiniciar el proceso: nada hardcodeado.
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PBI_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Credenciales del service principal de Azure AD con acceso a Power BI.
    # Obligatorias: la herramienta lee y dispara refreshes contra Power BI real.
    tenant_id: str = ""
    client_id: str = ""
    client_secret: str = ""
    # Scope del token de Power BI (normalmente no hace falta tocarlo).
    scope: str = "https://analysis.windows.net/powerbi/api/.default"
    # Base de la REST API de Power BI (override útil para soberanía/clouds).
    api_base: str = "https://api.powerbi.com/v1.0/myorg"
    # Autoridad de Azure AD para pedir el token.
    authority: str = "https://login.microsoftonline.com"

    # Orígenes permitidos para CORS (separados por coma). "*" = todos.
    cors_origins: str = "*"

    # Archivo donde se persisten los schedules (relativo al cwd o absoluto).
    db_path: str = "schedules.json"

    # Historial de corridas (audit log, JSON Lines append-only). Una línea por
    # refresh terminado. Vacío ("") desactiva el historial.
    runs_log_path: str = "runs.jsonl"

    # Nivel de log de la app (los loggers "pbi.*": scheduler, executor, powerbi).
    log_level: str = "INFO"

    # --- Scheduler (etapa B) ---
    # Si está activo, un worker en segundo plano dispara los schedules a su hora.
    scheduler_enabled: bool = True
    # Cada cuántos segundos el worker revisa si hay schedules vencidos y pollea los
    # refreshes en vuelo.
    scheduler_tick_seconds: int = 30
    # Offset fijo de la zona horaria de los horarios (ART = UTC-3, sin DST).
    tz_offset_hours: int = -3
    # Tope para un refresh "en curso": pasado este tiempo sin terminar, se marca
    # Failed (evita que un refresh colgado quede InProgress para siempre).
    refresh_poll_timeout_min: int = 120

    @property
    def cors_origin_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if raw == "*" or not raw:
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
