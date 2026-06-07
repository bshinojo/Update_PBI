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

Apuntá el frontend al backend con `VITE_API_MODE=http npm run dev` (en la raíz del repo).
El `HttpScheduleApi` usa `baseUrl='/api'` y Vite proxya `/api` → este backend en `:8000`
(ver `vite.config.ts`; override con `VITE_API_PROXY_TARGET`). En prod nginx hace el mismo
proxy. Verificado end-to-end: el `HttpScheduleApi` real corre contra esta API sin cambios.

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
- **Quién ejecuta el refresh** lo decide `app/executor.py`, con un protocolo de dos fases
  (`start` / `poll`) porque el refresh real es **asíncrono**:
  - `start(schedule)` dispara y devuelve un token para pollear (o `None` si el resultado ya es
    final: seed instantáneo, o Power BI sin id).
  - `poll(schedule, token)` consulta el estado y devuelve `InProgress` / `Completed` / `Failed`.
  - En modo `seed` es instantáneo por defecto; con `PBI_SEED_SIMULATE_REFRESH_TICKS > 0` simula
    un refresh que tarda N polls (para ver el "En curso" progresar en la demo). En modo `powerbi`
    usa `PowerBIClient.refresh_dataset()` (devuelve el `refreshId`) y `get_refresh_status()`.
- **Polling**: cada tick, además de disparar los vencidos, el scheduler pollea los refreshes en
  vuelo y resuelve `InProgress → Completed/Failed`. Un schedule con un refresh en curso no se
  re-dispara hasta que termine. Si un refresh excede `PBI_REFRESH_POLL_TIMEOUT_MIN` se marca
  `Failed` (anti-colgados).
- **Serialización por dataset**: Power BI no permite dos refreshes concurrentes sobre el mismo
  dataset, así que si un dataset ya tiene un refresh en vuelo, el disparo de otro schedule del
  mismo dataset se **difiere** al próximo tick (en vez de chocar y marcar `Failed`).
- Como API y scheduler comparten el store en memoria, **correr uvicorn con UN worker**
  (`--workers 1`, default). Apagar el worker: `PBI_SCHEDULER_ENABLED=0`.

Config relacionada: `PBI_SCHEDULER_ENABLED` (default `true`), `PBI_SCHEDULER_TICK_SECONDS`
(`30`), `PBI_TZ_OFFSET_HOURS` (`-3`), `PBI_REFRESH_POLL_TIMEOUT_MIN` (`120`),
`PBI_SEED_SIMULATE_REFRESH_TICKS` (`0`).

### Tests

```bash
pip install -r requirements-dev.txt
pytest                 # nextrun + scheduler (reloj controlado) + endpoints
```

> Nota: `PowerBIClient` sigue la documentación oficial pero **no se pudo probar contra el
> servicio real** (sin credenciales todavía). La lógica de disparo + polling está testeada con
> un cliente falso; lo que falta confirmar contra Power BI real es: (1) `list_tables` (usa DAX
> `INFO.VIEW.TABLES()`; requiere XMLA/ejecución de consultas habilitado), (2) de qué header sale
> el `refreshId` del enhanced refresh (`Location` / `x-ms-request-id`) y (3) los strings de estado
> (`Unknown`/`Completed`/`Failed`/...). Son ajustes de nombres en un solo archivo (`powerbi/client.py`).
