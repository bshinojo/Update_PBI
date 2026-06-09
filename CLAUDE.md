# CLAUDE.md

Guía para sesiones futuras de Claude Code en este repo. Resume la **idea total del
proyecto**, lo que **ya está hecho** y lo que **falta**.

> **Este archivo es la fuente de verdad del estado del proyecto** y donde se trackean los
> cambios entre sesiones: al cerrar trabajo importante, actualizalo (es lo que la próxima
> sesión de Claude va a leer). La memoria del proyecto vive en
> `~/.claude/projects/.../memory/` (índice en `MEMORY.md`) para datos puntuales/no obvios.

---

## 1. Qué es este proyecto (la idea total)

Herramienta **interna** para que los consultores de la firma programen **refreshes
selectivos** de modelos semánticos de Power BI (por tabla, con distinta frecuencia y tipo
de refresh) **sin escribir código**.

Alcance completo imaginado (no todo está construido todavía):

1. **Frontend** (esta primera etapa, ✅ hecha): capa gráfica para armar/editar las
   programaciones de forma visual.
2. **Backend FastAPI** (⏳ falta): expone la API real, guarda los schedules en una base, se
   integra con Power BI (REST API / XMLA) para listar workspaces/datasets/tablas y para
   **ejecutar** los refreshes selectivos (enhanced refresh API: lista de tablas + tipo).
3. **Scheduler** (⏳ falta, parte del backend): un cron/worker que dispara cada schedule a
   su hora y registra el resultado del último run.

> Estado actual: **frontend + backend FastAPI implementados y cableados** (el front habla
> con el backend vía `/api`). El backend lee y dispara los refreshes contra **Power BI real**
> y corre el scheduler. **No hay mock ni modo seed**: se quitaron en la limpieza (la app es
> Power BI-only y requiere credenciales). Lo único pendiente/fuera de alcance es la
> **autenticación** real (la cuenta del header es un stub visual).

### Prompt original (para no perder la intención)

> Construir la capa gráfica (solo frontend, por ahora) de una herramienta interna para que
> consultores programen refreshes selectivos de modelos semánticos de Power BI sin escribir
> código. Stack: React + Vite + TypeScript, sin frameworks de UI pesados, estética flat y
> limpia (bordes finos, blanco, sin gradientes ni sombras). Debe correr en dev en Windows y
> deployarse en un VPS Linux (Hetzner) con nginx sirviendo un build estático; evitar paths
> de Windows, usar rutas relativas y scripts npm cross-platform. Backend mockeado en
> `src/api/` con interfaces TS + implementación mock (datos inventados, delays 300-600ms),
> reemplazable por FastAPI sin tocar componentes. UI en español, con estados de carga
> (skeletons) y de "sin resultados", componentes chicos y separados.

---

## 2. Stack y restricciones (respetarlas)

- **React + Vite + TypeScript**. Deps de runtime: solo `react` + `react-dom`. **Sin** router,
  Redux, Zustand, React Query, UI kit ni librería de íconos/fechas.
- **CSS Modules + design tokens** en `src/index.css`. **Lenguaje de marca RFDD** (Romano,
  Fiocca & Díaz Delfino): ancla **navy `#0E2543`**, secundario **sky**, acento **gold** con
  moderación, fondo **paper `#F7F6F2`**; tipos **Cormorant Garamond** (títulos) + **Inter**
  (UI/números tabulares); labels en **versalitas tracked**; **sombras navy sutiles** y bordes
  hairline 1px. **Reemplaza la estética "flat por ausencia" original** (que prohibía sombras y
  serif). Fuente de verdad de tokens: `rfdd-design-system/project/colors_and_type.css`; el
  `:root` de `src/index.css` **remapea** los tokens de la app a valores RFDD (por eso
  re-tematizar fue casi solo tocar `index.css`, sin reescribir componentes).
- **UI 100% en español.**
- **Cross-platform (Windows dev → Linux/nginx):** `base: './'` en `vite.config.ts`,
  `forceConsistentCasingInFileNames` en `tsconfig.json`, `.gitattributes` con LF. Nada de
  paths absolutos de SO; imports siempre con `/` (los assets, p. ej. el logo, se importan en
  TS para que Vite genere URLs relativas al `base`).
- **Sin auth real todavía:** la barra superior (`AppHeader`) muestra cuenta + botón "Salir"
  **solo visual** (stub de una futura auth). El frontend habla siempre con el backend real
  vía `/api` (ver §6.A); no hay mock.

---

## 3. Arquitectura (cómo está organizado)

```
src/
  api/            ← EL SEAM. Componentes/hooks importan SOLO `api` (de index.ts) + tipos.
    types.ts      Tipos de dominio (Workspace, Dataset, TableInfo, Schedule, Frequency...).
    client.ts     interface ScheduleApi (contrato) + class ApiError.
    remote-data.ts RemoteData<T> = idle | loading | success | error.
    index.ts      Expone `api` = HttpScheduleApi (única implementación).
    http/         http-client.ts → HttpScheduleApi (baseUrl '/api', contra FastAPI)
  domain/         Lógica pura: frequency.ts (LAST_DAY=-1, formatFrequency, scheduleTime),
                  labels.ts (textos español, semana Lunes-primero), assert-never.ts
  hooks/          useRemoteData (guard de respuestas obsoletas) → useWorkspaces/useDatasets/useTables
  state/          SelectionContext.tsx (reducer: workspace/dataset elegidos + tablas tildadas)
  components/     AppHeader (barra superior NAVY de marca RFDD: logo invertido + watermark de
                  olas + título serif "Programador de Actualizaciones" + cuenta mock + "Salir"),
                  TopSelect (selectores del header), TablesPanel(+TableRow),
                  KpiStrip (tira de KPI tiles del modelo: tablas/programadas/en pausa/sin programar),
                  ScheduleForm/ (SchedulePanel = rail lateral + FrequencyFields + useScheduleForm),
                  ScheduleBadge, StatusIndicator, y primitivos en common/ (Icon, Skeleton,
                  EmptyState, ColumnHeader = banda de título común a las 3 columnas)
  App.tsx         Layout one-pager de 3 columnas (`25% 37.5% 37.5%`): AppHeader (marca +
                  cuenta) + grid [sidebar | tabla | rail]: COL 1 sidebar (selector Workspace
                  arriba, Modelo debajo, y las KPIs del modelo apiladas verticalmente); COL 2 la
                  tabla (lista); COL 3 el rail de programación (detalle). El cálculo de KPIs vive
                  acá (se pasa a KpiStrip). Auto-selecciona el primer
                  workspace/modelo.
```

**Regla de oro del seam:** ningún archivo fuera de `src/api/` debe importar de `api/http/`.
Solo se importa `{ api }` desde `src/api` y los tipos. Eso mantiene la implementación HTTP
encapsulada detrás del contrato `ScheduleApi`.

**Flujo de mutaciones:** las mutaciones del API devuelven `ScheduleMutationResult`
(`{ affected: Schedule|null, tables: TableInfo[] }`) y `useTables.applyMutation()` reconstruye
la vista local desde la respuesta (no hace un refetch a ciegas) — diseñado para sobrevivir a
un backend real con latencia.

---

## 4. Decisiones de producto ya tomadas (confirmadas con el usuario)

- **"Programar"** crea **UN** schedule que agrupa todas las tablas tildadas
  (`Schedule.tables: string[]`). Si una tabla ya tenía schedule, se **reasigna** (se quita del
  anterior; si el anterior queda vacío, se elimina) y el rail **avisa** qué tablas se mueven.
- **UI one-pager de 3 columnas** (rediseño pedido por el usuario, reemplaza el master-detail de
  2 columnas): sin drill-down ni modal. **COL 1 (sidebar `App.module.css .sidebar`)**: selector
  Workspace arriba, Modelo debajo, y las **4 KPIs del modelo apiladas** verticalmente (`KpiStrip`
  transpuesto). **COL 2**: la tabla (lista). **COL 3**: el rail de programación (crear sobre las
  seleccionadas / editar al clickear un badge). Anchos **`25% 37.5% 37.5%`** (`App.module.css
  .layout`). Tocar la selección de tablas sale del modo edición.
- **Encabezado por columna** (pedido del usuario, "para que se entienda qué hace cada columna"):
  las 3 columnas arrancan con un `<ColumnHeader>` (común, en `common/`) de **misma altura**
  (eyebrow gold en versalitas + título serif): **MODELO** "Workspace y modelo" · **TABLAS**
  "Tablas del modelo" · **PROGRAMACIÓN** "Nueva/Editar programación". El del rail recibe los
  botones (Programar / + Nueva·Eliminar·Guardar) en su slot `actions`.
- **Diseño RFDD** (pedido por el usuario): se adoptó el design system de la firma
  (`rfdd-design-system/`) en reemplazo de la estética flat. Detalles de tokens/tipos en §2.
- **Barra superior de marca (mock)**: `AppHeader` navy con logo RFDD, título serif
  **"Programador de Actualizaciones"** (sin subtítulo) y una **cuenta de ejemplo** (avatar con
  iniciales) + botón **"Salir"**. **Solo visual**: no hay auth/sesión.
- **Formulario de programación rediseñado** (pedido del usuario, "más vistoso y moderno"):
  segmented de frecuencia full-width (pill navy), "Habilitado" como **toggle switch**, **tarjeta de
  Resumen en vivo** y el texto de tablas objetivo **integrado en el cuerpo** (tarjeta sutil / hint).
  **Cards estilo RFDD** (pedido del usuario, reemplazan la barra de acento a la izquierda "estilo
  Claude"): borde hairline + sombra navy sutil; el Resumen lleva **regla superior gold**
  (`border-top`) como flourish de marca.
- **Tipo de refresh NO es elegible** (decisión del usuario, para evitar el footgun de `dataOnly`/
  `calculate`): **siempre `full`** (Completo = datos + recálculo). El rail ya no muestra un selector,
  solo un texto que explica el modo; `useScheduleForm` no guarda `refreshType` y `SchedulePanel`
  lo envía como literal `'full'` en el submit. (Los valores `dataOnly`/`calculate` siguen en el
  tipo `RefreshType` y los acepta el backend, pero la UI no los ofrece.)
- **Acciones del rail** (cambio pedido por el usuario): en alta, el CTA **"Programar N"** vive en
  el header (a la derecha del título). En **edición**, los botones **Eliminar / Guardar cambios**
  van TAMBIÉN en el header, al lado de **"+ Nueva"** (`.railActions`); ya no hay footer.
- **Sidebar (col 1)**: los **selectores Workspace/Modelo** (`TopSelect`, full-width, label arriba)
  y el `KpiStrip` (KPIs **apiladas verticalmente**: tile compacto = label izq, número der, nota
  abajo) viven acá, no en una barra superior. La tabla (col 2) va sin encabezado propio.
- **Selección de tablas por fila** (cambio pedido por el usuario): **no hay checkbox**; se
  selecciona/deselecciona **tocando cualquier parte de la fila** (`TableRow` → `onClick`), y la
  selección se ve por el **resaltado** (tinte sky). La fila es focusable (Tab + Enter/Espacio) con
  `aria-label`. El badge de programación frena la propagación para que **editar** no togglee la
  selección. "Seleccionar todas / Quitar selección" es un **botón de texto** en la cabecera "Tabla".
- **Resaltado de filas en edición**: las filas de la programación que se edita se resaltan (tinte
  sky + acento gold a la izquierda en la 1ª celda). `TablesPanel` recibe `editingTables` desde
  `App`; ver `TableRow` (`rowChecked`/`rowEditing`).
- **Frecuencias (modelo y reglas, confirmadas con el usuario):**
  - **Diario** = horario + **días de la semana** (multi, default todos). `DailyFrequency.daysOfWeek?`.
  - **Cada N** = intervalo elegido en un **combobox** que incluye **sub-hora (15/20/30 min)** y horas
    (1–24), + **franja `startHour`/`endHour`** + **días** (multi). Intervalo: hora entera →
    `everyHours`; sub-hora → `everyMinutes` (prioriza minutos; resolver `hourlyIntervalMinutes`).
  - **Semanal** = **un solo día** (elección única) + horario. (Si querés varios días, es "Diario
    con días".) `WeeklyFrequency.daysOfWeek` se guarda con 1 elemento.
  - **Mensual** = "último día del mes" (`dayOfMonth: -1`) o día 1–28.
  - Campos opcionales (días/franja/minutos) se **omiten cuando son el default** → JSON limpio y
    compatible con schedules viejos. Scheduler (`backend/app/nextrun.py`): diario respeta días;
    horario itera **cada `interval` minutos** dentro de `[start:00, end:00]` y respeta los días.
    Validación en `useScheduleForm.buildFrequency`.
- **Checkbox "Habilitado"** = schedule **activo** (el scheduler lo dispara a su hora);
  destildado = **pausado** (se guarda y conserva tablas/config, pero no corre). Backend:
  `scheduler.py` solo recorre `all_enabled_schedules()`.
- **Persistencia** de los schedules en el backend (`backend/schedules.json`, escritura atómica).
- **Zona horaria** fija, display-only: `ART (UTC-3)` (no se guarda por schedule). La semana se
  muestra **empezando por Lunes**.
- **Tipo de refresh**: **siempre `full` (Completo)**, no elegible desde la UI (ver decisión arriba).
  Ref. de los tres tipos en sección 7.

---

## 5. Lo que YA está hecho (✅)

- Frontend completo (layout **one-pager de 3 columnas**: barra de marca RFDD + grid
  [sidebar con selectores + KPIs | tabla (lista) | rail de programación]), badges de programación,
  estados de último run (✓/✗/spinner/—), crear/editar/eliminar en el rail + toggle habilitar,
  "Programar" con reasignación, skeletons de carga, empty states.
- **Diseño RFDD aplicado a fondo** (pedido explícito de que "se note más"): tema en
  `src/index.css` (tokens navy/sky/gold/paper + fuentes Cormorant+Inter), **barra superior navy**
  (`AppHeader`) con logo invertido (`filter: brightness(0) invert(1)`), **watermark de olas**
  (`pattern-waves.svg`) y eyebrow gold; patrón **eyebrow (gold tracked) + título serif** en los
  headers de ambos paneles; **tira de KPI tiles** (`KpiStrip`) con el resumen del modelo; contador
  de selección como chip sky. Assets en `src/components/AppHeader/` (logo + olas), emblema como
  `public/favicon.svg`. Verificado por captura headless (typecheck + build limpios).
- `npm run typecheck` y `npm run build` limpios. Build estático servible por nginx
  (`nginx.example.conf` incluido). Verificado en navegador real contra el backend.
- **Tests unitarios del front (Vitest, `npm run test`): 19, todo verde.** Cubren la lógica pura:
  `domain/frequency.ts` (`formatFrequency`, `scheduleTime`, `hourlyIntervalMinutes`, `formatHour`)
  y la validación `ScheduleForm/useScheduleForm.buildFrequency` (todas las frecuencias + bordes).
- **Backend FastAPI (etapa A, ver §6.A): implementado en `backend/`.** Los 8 endpoints del
  contrato, JSON camelCase idéntico a `types.ts` (sin mapeo en `http-client.ts`), persistencia
  en archivo JSON, reasignación + invariante. **Power BI-only**: requiere credenciales por
  `.env` (sin ellas no arranca). Probado de punta a punta con `TestClient` (con `FakeDataSource`
  de test, sin credenciales) y con uvicorn real. **Lecturas verificadas contra Power BI real (2026-06-06):**
  auth, workspaces, datasets y tablas (XMLA). **Falta sólo el refresh real** (ver §6.B).
- **Scheduler (etapa B, ver §6.B): implementado en `backend/`.** Worker en segundo plano que
  dispara los schedules a su hora (ART), **pollea** los refreshes asíncronos en vuelo y registra
  `lastRun` (`InProgress`→`Completed/Failed`, con timeout anti-colgados). Lógica de "próxima
  corrida" pura y testeada (`nextrun.py`), executor con protocolo `start`/`poll`, suite `pytest`
  (35 tests, todo verde sin credenciales). **Falta verificar el refresh real contra Power BI**
  (nombres de header/estado del refresh, ver §6.B); las lecturas ya se verificaron (2026-06-06).

---

## 6. Lo que FALTA (próximos pasos, en orden)

### A) Backend FastAPI — ✅ HECHO (en `backend/`), salvo la verificación con credenciales

Implementa el contrato `ScheduleApi` (ver `src/api/client.ts`). El stub
`src/api/http/http-client.ts` espera estos endpoints (baseUrl por defecto `/api`):

| Método | Endpoint | Body | Devuelve |
|---|---|---|---|
| GET | `/workspaces` | — | `Workspace[]` |
| GET | `/workspaces/{workspaceId}/datasets` | — | `Dataset[]` |
| GET | `/datasets/{datasetId}/tables` | — | `TableInfo[]` |
| GET | `/datasets/{datasetId}/schedules` | — | `Schedule[]` |
| POST | `/schedules` | `CreateScheduleInput` | `ScheduleMutationResult` |
| PATCH | `/schedules/{id}` | `UpdateScheduleInput` | `ScheduleMutationResult` |
| PUT | `/schedules/{id}/enabled` | `{ enabled }` | `ScheduleMutationResult` |
| DELETE | `/schedules/{id}` | — | `ScheduleMutationResult` |
| POST | `/schedules/{id}/run` | — | `ScheduleMutationResult` ("Ejecutar ahora"; 409 si ya corre, 503 sin scheduler) |

Cómo quedó (ver `backend/README.md` para correr/deployar):
- **`backend/app/models.py`**: modelos Pydantic espejando `types.ts`, serializados en camelCase
  (`alias_generator`), `Frequency` como unión discriminada por `kind`. El `time` lo deriva el
  backend (`frequency.py`), no lo manda el cliente. **No hace falta mapear nada en `http-client.ts`.**
- **`backend/app/store.py`**: reasignación + invariante "cada schedule ≥1 tabla", persistido en
  archivo JSON (`PBI_DB_PATH`, escritura atómica). Diferencia de diseño: las tablas NO guardan
  `scheduleId`; el universo de tablas lo da el `DataSource` (Power BI) y el `scheduleId` se DERIVA
  de los schedules en cada respuesta. Si no hay archivo, arranca **vacío** (sin schedules de demo).
- **`backend/app/datasource.py` + `powerbi/client.py`**: lecturas desde Power BI (REST API + token
  client-credentials; tablas vía XMLA/DAX). El `PowerBIClient` tiene `refresh_dataset()` (enhanced
  refresh selectivo) y `get_refresh_status()` que usa el scheduler.
- **Tablas de modelos con RLS (fallback Scanner API):** los modelos con seguridad a nivel de fila
  (RLS, `isEffectiveIdentityRequired: true`) rechazan las consultas DAX del service principal con
  **401 `PowerBINotAuthorizedException`**, así que `executeQueries`/`INFO.VIEW.TABLES()` no puede
  listar sus tablas. Ante ese 401, `client.list_tables` cae a la **Scanner API** (admin metadata,
  `POST /admin/workspaces/getInfo` → poll `scanStatus` → `scanResult`), que lee el esquema **sin
  ejecutar DAX** (esquiva el RLS). El resultado (mapa `dataset_id → [tablas]` de todos los workspaces
  visibles) se **cachea** `PBI_SCANNER_CACHE_TTL_MIN` min. Requiere que el tenant habilite *"service
  principals can use read-only admin APIs"* (ya está habilitado en el tenant de prueba). Si el scan
  falla (o `PBI_SCANNER_ENABLED=0`), se levanta `TablesUnavailableError` → la ruta responde **502 con
  `detail`** y el front lo muestra en su estado de error (en vez del falso "el modelo no tiene tablas").
  Verificado contra el tenant real (2026-06-08). Detalle en la memoria del proyecto.
- **Credenciales por `.env`** (prefijo `PBI_`, ver `backend/.env.example`):
  `PBI_TENANT_ID/CLIENT_ID/CLIENT_SECRET` (obligatorias), etc. Cambiar credenciales = editar `.env`
  y reiniciar. **No hay modo seed**: sin credenciales el backend no arranca.
- **Las rutas usan `response_model_exclude_none`**: omiten `scheduleId`/`lastRun`/`affected` cuando
  son `None`, así los campos opcionales (TS `?`) van ausentes. El front los trata por truthiness.

**Modo http cableado y VERIFICADO end-to-end**: el `HttpScheduleApi` real corre contra FastAPI
(lecturas, crear/editar/pausar/eliminar, reasignación, error 404, camelCase). En DEV:
`cd backend && ./run.sh` + `npm run dev` (Vite proxya `/api`→backend, ver `vite.config.ts`).
En PROD: nginx proxya `/api/`→backend. **Ningún componente del front cambia.**

> ✅ **Lecturas verificadas contra Power BI real (2026-06-06)** con un service principal:
> auth client-credentials, `GET /workspaces`, `/datasets` y `/tables` (este último vía DAX
> `INFO.VIEW.TABLES()` — **XMLA está habilitado** en la capacidad de prueba), y `DELETE /schedules`.
> Falta sólo disparar un **refresh real** (ver §6.B). Las credenciales van en `backend/.env`
> (gitignored); `PBI_CLIENT_SECRET` es el **Value** del secret, no el *Secret ID* (un GUID → da
> `AADSTS7000215`).

### B) Scheduler / ejecución real — ✅ HECHO (en `backend/`)

Worker en segundo plano que corre en el MISMO proceso que la API (arranca/para con el
`lifespan`, comparte el store en memoria → uvicorn con 1 worker):
- **`backend/app/nextrun.py`**: lógica PURA de "próxima corrida" en ART (diario con días JS,
  semanal por día, mensual con "último día", y horario cada `interval` minutos —sub-hora o
  horas— dentro de la franja `[start:00, end:00]` y respetando los días).
- **`backend/app/scheduler.py`**: `tick(now)` (puro respecto del reloj, fácil de testear) (1)
  dispara los schedules vencidos y (2) **pollea los refreshes en vuelo** resolviendo
  `InProgress`→`Completed/Failed`. Lleva un dict de pendientes (`scheduleId→{token,started_at,
  snapshot}`); un schedule con refresh en curso no se re-dispara hasta terminar; si supera
  `PBI_REFRESH_POLL_TIMEOUT_MIN` se marca `Failed`. **Serializa por dataset**: si el dataset ya
  tiene un refresh en vuelo, difiere el disparo de otro schedule del mismo dataset al próximo tick
  (Power BI no permite refreshes concurrentes sobre el mismo dataset). Un hilo daemon llama
  `tick()` cada `PBI_SCHEDULER_TICK_SECONDS`.
  - **Resiliencia** (paquete "robustez"): `due_schedules` aísla cada schedule en try/except, así
    una frecuencia corrupta (JSON editado a mano) no mata el tick entero. Y al arrancar,
    `reconcile_orphans()` marca `Failed` los `InProgress` que quedaron en disco tras un reinicio
    (su token de polling se perdió; evita el spinner eterno en la UI).
  - **Ejecutar ahora** (paquete "estado vivo"): `run_now(scheduleId)` dispara a demanda, fuera de
    horario y aunque el schedule esté pausado (lo manual es decisión explícita). Rechaza con
    `AlreadyRunningError` si ese schedule (u otro del mismo dataset) ya tiene un refresh en vuelo.
    `tick()` y `run_now()` se serializan con `_op_lock` (el handler HTTP y el hilo comparten
    `_pending`). Ruta: `POST /schedules/{id}/run` (404/409; 503 si el hilo no corre, porque nadie
    pollearía el refresh).
  - **Estado vivo en la UI** (front): `useTables` pollea `GET /schedules` cada 30 s en segundo
    plano (solo schedules: no toca Power BI) y mergea sin pasar por `loading` → el spinner
    "En curso" se resuelve solo en pantalla. `useRemoteData.setData` invalida respuestas en vuelo
    (token), y `applyMutation` descarta resultados de OTRO dataset (race al cambiar de modelo con
    una mutación en vuelo). El rail en edición tiene botón **"▶ Ejecutar ahora"** y **Eliminar
    pide confirmación** (segundo click; se desarma al perder foco).
- **`backend/app/executor.py`**: protocolo de dos fases `start(schedule)->token|None` y
  `poll(schedule,token)->RunStatus` (el refresh real es asíncrono). `PowerBIRefreshExecutor`:
  `refresh_dataset()` (devuelve `refreshId`) + `get_refresh_status()`; `_map_status` traduce el
  estado de PBI a `RunStatus`.
- **Observabilidad**: los loggers `pbi.*` (scheduler/executor/powerbi) registran qué se dispara
  y el resultado de cada refresh (incluido el POST real con su HTTP status y `refreshId`); el
  setup está en `_configure_logging()` de `main.py`. Además, cada refresh **terminado** deja una
  línea en el **historial** `runs.jsonl` (`app/runlog.py`: append-only JSON Lines, thread-safe y
  **blindado** —si falla escribir, no corta el scheduler). `lastRun` (en `schedules.json`) guarda
  solo el ÚLTIMO run por schedule; `runs.jsonl` es el histórico completo.
- Config: `PBI_SCHEDULER_ENABLED` (true), `PBI_SCHEDULER_TICK_SECONDS` (30), `PBI_TZ_OFFSET_HOURS`
  (-3), `PBI_REFRESH_POLL_TIMEOUT_MIN` (120), `PBI_RUNS_LOG_PATH` (`runs.jsonl`), `PBI_LOG_LEVEL` (`INFO`).
- **Tests** (`backend/tests/`, `pip install -r requirements-dev.txt && pytest`): `nextrun` (todas las
  frecuencias y bordes), scheduler con reloj controlado + executor falso (disparo, polling
  InProgress→Completed/Failed, timeout, no re-disparo en vuelo, serialización por dataset), executor
  (mapeo de estados + delegación al cliente con cliente falso), y los 8 endpoints. Corren **sin
  credenciales** con una `FakeDataSource` (`tests/_fixtures.py`). 54 tests, todo verde.
- **Validación de inputs (paquete "robustez")**: los modelos de input (`models.py`) validan rangos
  además de la UI (defensa en profundidad, porque la API no tiene auth): `time` "HH:mm",
  `startHour/endHour` 0–23 (y desde≤hasta), `daysOfWeek` 0–6, `dayOfMonth` 1–28 o -1, y ≥1 tabla
  (`CreateScheduleInput`/`UpdateScheduleInput`). `POST /schedules` además **rechaza con 400** las
  tablas que no existan en el modelo (si las tablas no se pueden leer por RLS, no bloquea).

> ✅ **Lecturas y refresh verificados contra Power BI real (2026-06-06)**: auth client-credentials,
> `/workspaces`, `/datasets`, `/tables` (XMLA/DAX `INFO.VIEW.TABLES()`) y el enhanced refresh
> (`refresh_dataset` → `refreshId` del header `Location`) + polling de estado. Detalles en la
> memoria del proyecto.

### C) Mejoras conocidas (opcionales)
- **Autenticación** (login, sesión) — explícitamente fuera de alcance de la etapa 1.
- Updates optimistas, edición del set de tablas desde el rail de edición.

---

## 7. Referencia rápida: tipos de refresh

`full` = trae datos + recalcula (default). `dataOnly` = solo trae datos, no recalcula.
`calculate` = no trae datos, solo recalcula lo derivado. Patrón eficiente en modelos grandes:
varios `dataOnly` + un único `calculate` al final.

---

## 8. Comandos

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/ estático
npm run preview    # sirve dist/ para verificar
npm run typecheck  # tsc --noEmit (incluye chequeo de casing cross-platform)
npm run test       # vitest run (tests unitarios de la lógica pura del front)
```

Necesita el backend corriendo (`cd backend && ./run.sh`); Vite proxya `/api`→`:8000`. La única
variable del front es `VITE_API_PROXY_TARGET` (destino del proxy en dev; ver `.env.example`). La
config del backend va en `backend/.env` (prefijo `PBI_`).

---

## 9. Convenciones al trabajar acá

- Respetar el **seam**: no importar de `api/http` fuera de `src/api/` (la app usa `{ api }`).
- Mantener el **lenguaje de marca RFDD** (navy/sky/gold/paper, Cormorant+Inter, labels en
  versalitas, sombras navy sutiles; ver §2 y `rfdd-design-system/`) y la **UI en español**.
- Cada nivel de navegación maneja **loading + empty + error** (vía `RemoteData`).
- Switches sobre uniones discriminadas se cierran con `assertNever` (exhaustividad).
- Componentes chicos y separados, un `.module.css` co-locado por componente.
