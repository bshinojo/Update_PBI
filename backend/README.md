# Backend — PBI Refresh Scheduler API

Backend **FastAPI** que implementa el contrato `ScheduleApi` del frontend
(`src/api/client.ts`). Persiste los schedules en un archivo JSON (sin base de datos:
portable y liviano para el VPS) y, cuando se le dan credenciales, lee de Power BI.

## Características

- **8 endpoints** que espejan el contrato (ver tabla abajo), con JSON en **camelCase**
  idéntico a `src/api/types.ts` — el `HttpScheduleApi` del front no necesita mapear nada.
- **Sin DB:** los schedules se guardan en `schedules.json` (configurable). Escritura atómica.
- **Reasignación de tablas** e invariante "cada schedule ≥ 1 tabla", port fiel de
  `src/api/mock/store.ts`.
- **Credenciales por `.env`** (prefijo `PBI_`). Cambiar de modo o de credenciales es editar
  el `.env` y reiniciar — nada hardcodeado.
- **Modo seed por defecto:** arranca y funciona sin credenciales (datos de ejemplo).

## Correr en local

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # opcional; por defecto corre en modo "seed"
./run.sh                         # uvicorn en http://127.0.0.1:8000 (--reload)
# docs interactivas: http://127.0.0.1:8000/docs
```

Apuntá el frontend al backend con `VITE_API_MODE=http`. El `HttpScheduleApi` usa
`baseUrl='/api'` por defecto; en dev, o servís el front detrás de un proxy a `/api`,
o ajustás el `baseUrl` a `http://localhost:8000`.

## Configuración (`.env`, prefijo `PBI_`)

| Variable | Default | Para qué |
|---|---|---|
| `PBI_DATA_SOURCE` | `seed` | `seed` (datos de ejemplo) o `powerbi` (REST API real) |
| `PBI_TENANT_ID` / `PBI_CLIENT_ID` / `PBI_CLIENT_SECRET` | — | Service principal de Azure AD (solo modo `powerbi`) |
| `PBI_SCOPE` | `…/powerbi/api/.default` | Scope del token |
| `PBI_API_BASE` | `https://api.powerbi.com/v1.0/myorg` | Base REST (override para clouds soberanos) |
| `PBI_AUTHORITY` | `https://login.microsoftonline.com` | Autoridad de Azure AD |
| `PBI_CORS_ORIGINS` | `*` | Orígenes permitidos (coma) |
| `PBI_DB_PATH` | `schedules.json` | Archivo de persistencia |

## Endpoints

| Método | Ruta | Body | Devuelve |
|---|---|---|---|
| GET | `/workspaces` | — | `Workspace[]` |
| GET | `/workspaces/{workspaceId}/datasets` | — | `Dataset[]` |
| GET | `/datasets/{datasetId}/tables` | — | `TableInfo[]` |
| GET | `/datasets/{datasetId}/schedules` | — | `Schedule[]` |
| POST | `/schedules` | `CreateScheduleInput` | `ScheduleMutationResult` |
| PATCH | `/schedules/{id}` | `UpdateScheduleInput` | `ScheduleMutationResult` |
| PUT | `/schedules/{id}/enabled` | `{ enabled }` | `ScheduleMutationResult` |
| DELETE | `/schedules/{id}` | — | `ScheduleMutationResult` |

`GET /health` devuelve `{ status, dataSource }`.

## Despliegue en el VPS (Hetzner / Linux)

1. **Servicio systemd** (`/etc/systemd/system/pbi-api.service`):

   ```ini
   [Unit]
   Description=PBI Refresh Scheduler API
   After=network.target

   [Service]
   WorkingDirectory=/opt/pbi/backend
   EnvironmentFile=/opt/pbi/backend/.env
   ExecStart=/opt/pbi/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
   Restart=always
   User=www-data

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl enable --now pbi-api
   ```

2. **nginx**: agregá al `server {}` que ya sirve el frontend un proxy de `/api/` al backend
   (la barra final en `proxy_pass` quita el prefijo `/api`, así el backend ve `/workspaces`):

   ```nginx
   location /api/ {
       proxy_pass http://127.0.0.1:8000/;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   }
   ```

## Scheduler (etapa B) — ✅ implementado

Un worker en segundo plano (`app/scheduler.py`) corre **dentro del mismo proceso** que la API
(arranca/para con el `lifespan`), revisa cada `PBI_SCHEDULER_TICK_SECONDS` qué schedules
habilitados vencieron, los dispara y registra el `lastRun` (`InProgress` → `Completed`/`Failed`).

- **Cuándo vence cada frecuencia** lo calcula `app/nextrun.py` (lógica pura, en ART/UTC-3):
  diario, semanal (días JS), mensual (incluye "último día"), y horario (cada N horas ancladas
  a la medianoche).
- **Quién ejecuta el refresh** lo decide `app/executor.py`: en modo `seed` solo loguea (simula
  éxito, sirve para probar sin credenciales); en modo `powerbi` llama a
  `PowerBIClient.refresh_dataset()` (enhanced refresh selectivo).
- Como API y scheduler comparten el store en memoria, **correr uvicorn con UN worker**
  (`--workers 1`, default). Apagar el worker: `PBI_SCHEDULER_ENABLED=0`.

Config relacionada: `PBI_SCHEDULER_ENABLED` (default `true`), `PBI_SCHEDULER_TICK_SECONDS`
(default `30`), `PBI_TZ_OFFSET_HOURS` (default `-3`).

### Tests

```bash
pip install -r requirements-dev.txt
pytest                 # nextrun + scheduler (reloj controlado) + endpoints
```

> Nota: `PowerBIClient` sigue la documentación oficial pero **no se pudo probar contra el
> servicio real** (sin credenciales todavía). Revisar especialmente `list_tables` (usa DAX
> `INFO.VIEW.TABLES()`; requiere XMLA/ejecución de consultas habilitado en la capacidad) y el
> ciclo real del refresh (es asíncrono: hoy marcamos `Completed` al disparar OK; con Power BI
> habría que **pollear** el estado del refresh para resolver `InProgress` → `Completed/Failed`).
