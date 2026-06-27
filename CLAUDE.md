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
selectivos** de modelos semánticos de Power BI (por tabla, con distinta frecuencia)
**sin escribir código**.

Las tres piezas del proyecto (todas implementadas):

1. **Frontend** (✅): capa gráfica one-pager para armar/editar las programaciones.
2. **Backend FastAPI** (✅): API real; guarda los schedules en un archivo JSON; se integra con
   Power BI (REST API + XMLA/DAX) para listar workspaces/datasets/tablas y para **ejecutar** los
   refreshes selectivos (enhanced refresh API: lista de tablas).
3. **Scheduler** (✅, dentro del backend): worker que dispara cada schedule a su hora, **pollea**
   el refresh asíncrono y registra el resultado del último run.

> Estado actual: **frontend + backend FastAPI + scheduler implementados y cableados** (el front
> habla con el backend vía `/api`). El backend lee y dispara los refreshes contra **Power BI real**.
> **No hay mock ni modo seed**: la app es Power BI-only y requiere credenciales para arrancar. Lo
> único fuera de alcance es la **autenticación** real (no hay login; el header muestra el
> indicador de salud del scheduler, no una cuenta). Lo único pendiente de verificar contra el
> tenant real es el **disparo del refresh end-to-end** (las lecturas y el listado de tablas ya se
> verificaron — ver §6).

### Idea original (para no perder la intención)

> Herramienta interna para que consultores programen refreshes selectivos de modelos semánticos de
> Power BI sin escribir código. Stack: React + Vite + TypeScript, sin frameworks de UI pesados.
> Correr en dev en Windows y deployarse en un VPS Linux (Hetzner) con nginx sirviendo un build
> estático; cross-platform (rutas relativas, scripts npm). UI en español, con estados de carga
> (skeletons) y de "sin resultados", componentes chicos y separados.
>
> *(El arranque original tenía un backend mockeado en `src/api/`; se reemplazó por el FastAPI real
> y luego se eliminó el mock por completo — la app es Power BI-only.)*

---

## 2. Stack y restricciones (respetarlas)

- **React + Vite + TypeScript**. Deps de runtime: solo `react` + `react-dom`. **Sin** router,
  Redux, Zustand, React Query, UI kit ni librería de íconos/fechas.
- **CSS Modules + design tokens** en `src/index.css`. **Lenguaje de marca RFDD** (Romano,
  Fiocca & Díaz Delfino): ancla **navy `#0E2543`**, secundario **sky**, acento **gold** con
  moderación, fondo **paper `#F7F6F2`**; tipos **EB Garamond** (display/títulos) + **Source Serif 4**
  (lead) + **Inter** (UI/números tabulares); labels en **versalitas tracked**; **sombras navy
  sutiles** y bordes hairline 1px. **Reemplaza la estética "flat por ausencia" original** (que
  prohibía sombras y serif). Fuente de verdad de tokens: `rfdd-design-system/project/colors_and_type.css`;
  el `:root` de `src/index.css` **remapea** los tokens de la app a valores RFDD. El **kit ya usa
  EB Garamond** como display (se reemplazó Cormorant Garamond, la serif original de alto
  contraste, para que kit y front queden alineados — pedido del usuario 2026-06-10).
- **UI 100% en español.**
- **Cross-platform (Windows dev → Linux/nginx):** `base: './'` en `vite.config.ts`,
  `forceConsistentCasingInFileNames` en `tsconfig.json`, `.gitattributes` con LF. Nada de
  paths absolutos de SO; imports siempre con `/` (los assets, p. ej. el logo, se importan en
  TS para que Vite genere URLs relativas al `base`).
- **Sin auth real todavía:** no hay login ni sesión (el stub de cuenta + "Salir" que tuvo el
  header se quitó; hoy la barra muestra el **indicador de salud del scheduler**). El frontend
  habla siempre con el backend real vía `/api` (ver §6.A); no hay mock.
- **Terminología de la UI: "actualización"** (es el nombre del producto). Nada de "run" /
  "refresh" / "corrida" en textos visibles: "Última actualización", "Actualización disparada",
  "Tipo de actualización". (En código y logs, `run`/`refresh` está bien.)

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
                  labels.ts (textos español, semana Lunes-primero), assert-never.ts,
                  report.ts (summarizeRuns + activityByDay para la vista --INFORME--)
  hooks/          useRemoteData (guard de respuestas obsoletas) → useWorkspaces/useDatasets/useTables;
                  useHealth (pollea /health p/ el header), useRuns (historial del schedule en edición),
                  useReport (pollea /report p/ la vista --INFORME--, cada 15s)
  state/          SelectionContext.tsx (reducer: workspace/dataset elegidos + tablas tildadas)
  components/     AppHeader (barra superior NAVY de marca RFDD: logo invertido + watermark de
                  olas + título serif "Programador de Actualizaciones" + pill de salud del
                  scheduler — "Programador activo/detenido/Sin conexión", de useHealth),
                  TopSelect (selectores del header), TablesPanel(+TableRow),
                  KpiStrip (KPI tiles del modelo; CLICKEABLES: filtran la tabla por estado),
                  UpcomingRuns (próximas 3 ejecuciones del modelo, de nextRunAt),
                  InformePanel/ (vista --INFORME--: ReportSummary = tiles de estado +
                  contadores de programaciones + barra de actividad; RunsTable = tabla de
                  las últimas actualizaciones, más recientes primero),
                  ScheduleForm/ (SchedulePanel = rail lateral + FrequencyFields + useScheduleForm),
                  ScheduleBadge, StatusIndicator, y primitivos en common/ (Icon, Skeleton,
                  EmptyState, ColumnHeader = banda de título común a las 3 columnas)
  App.tsx         Layout one-pager de 3 columnas (`25% 37.5% 37.5%`): AppHeader + grid
                  [sidebar | tabla | rail]: COL 1 sidebar (selectores Workspace/Modelo, KPIs
                  apiladas y Próximas ejecuciones); COL 2 la tabla (lista); COL 3 el rail.
                  Acá viven: cálculo de KPIs, filtro por estado (KPI tiles), modo edición de
                  membresía (editTables), stash/restore de la selección al entrar/cancelar
                  edición, y el flash de éxito. Auto-selecciona el primer workspace/modelo.
                  Entradas sintéticas del combobox de Workspace (no son de Power BI, van
                  primero): --GENERAL-- (instructivo, WelcomeGuide) y --INFORME-- (historial
                  global, InformePanel); ambas ocupan las columnas 2-3 (.welcomeArea) y no
                  cargan modelos (isSpecial = isGeneral || isInforme).
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
  Workspace arriba, Modelo debajo, las **4 KPIs del modelo apiladas** verticalmente (`KpiStrip`
  transpuesto) y **Próximas ejecuciones** (`UpcomingRuns`). **COL 2**: la tabla (lista). **COL 3**:
  el rail de programación (crear sobre las seleccionadas / editar al clickear un badge). Anchos
  **`25% 37.5% 37.5%`** (`App.module.css .layout`).
- **Modo edición con membresía editable** (paquete UX 2026-06-10; REEMPLAZA la regla anterior
  "tocar la selección sale del modo edición"): en edición, **tocar una fila agrega/quita la tabla
  de la programación editada** (`App.editTables`, se aplica con "Guardar cambios"; PATCH manda
  `tables`). Al entrar a editar, la selección que hubiera se **guarda** y se **restaura al
  cancelar** con "+ Nueva" (al guardar/eliminar se descarta) — así un misclick en el badge no
  cuesta la selección. El aviso de reasignación corre también en edición e indica **de qué
  programación** viene cada tabla.
- **Encabezado por columna** (pedido del usuario, "para que se entienda qué hace cada columna"):
  las 3 columnas arrancan con un `<ColumnHeader>` (común, en `common/`) de **misma altura**
  (eyebrow gold en versalitas + título serif): **MODELO** "Workspace y modelo" · **TABLAS**
  "Tablas del modelo" · **PROGRAMACIÓN** "Nueva/Editar programación". El del rail recibe los
  botones (Programar / + Nueva·Eliminar·Guardar) en su slot `actions`.
- **Diseño RFDD** (pedido por el usuario): se adoptó el design system de la firma
  (`rfdd-design-system/`) en reemplazo de la estética flat. Detalles de tokens/tipos en §2.
- **Barra superior de marca**: `AppHeader` navy con logo RFDD y título serif
  **"Programador de Actualizaciones"** (sin subtítulo). A la derecha, el **pill de salud del
  scheduler** ("Programador activo/detenido/Sin conexión", pollea `GET /health` cada 30 s vía
  `useHealth`) — reemplazó al stub de cuenta + "Salir" que había antes. Sigue sin haber
  auth/sesión.
- **Formulario de programación rediseñado** (pedido del usuario, "más vistoso y moderno"):
  segmented de frecuencia full-width (pill navy), "Habilitado" como **toggle switch**, **Resumen
  en vivo** y el texto de tablas objetivo **integrado en el cuerpo** (tarjeta sutil / hint).
  **Cards estilo RFDD** (pedido del usuario, reemplazan la barra de acento a la izquierda "estilo
  Claude"): borde hairline + sombra navy sutil. El **Resumen es un footer fijo del rail**
  (paquete UX 2026-06-10: antes era una tarjeta al fondo del scroll y en notebooks quedaba bajo
  el fold) con la **regla superior gold** como flourish de marca.
- **"Habilitado" en edición aplica AL INSTANTE** (paquete UX 2026-06-10): el switch llama
  `PUT /schedules/{id}/enabled` (endpoint que estaba implementado y sin usar) sin pasar por
  Guardar; en alta solo define el estado inicial. Si el PUT falla, se revierte y se muestra el
  error.
- **Historial + motivo de fallo** (paquete UX 2026-06-10): en edición el rail muestra
  **"Últimas actualizaciones"** (GET `/schedules/{id}/runs`, de `runs.jsonl`; la UI pide
  **máx. 5**) con duración y el **error** de las fallidas; va ARRIBA del formulario (quien entra
  tras un fallo busca el "por qué"). Es **colapsable** (botón chevron + contador, pedido del
  usuario para que no empuje el formulario): arranca **cerrado**, y **se abre solo si la última
  corrida falló** (también se auto-abre si pasa a Failed con el rail abierto; se puede volver a
  cerrar). El ✗ de la tabla también muestra el motivo en su tooltip (`lastRun.error`).
- **Próxima ejecución visible** (paquete UX 2026-06-10): el backend deriva **`nextRunAt`** en
  cada respuesta (de `nextrun.py`; pausado = ausente) y la UI lo muestra en la tarjeta EDITANDO
  del rail, en el tooltip del badge y en **Próximas ejecuciones** del sidebar (top 3 del modelo).
  Formato `formatNextRun` ("hoy 14:00", "mañana 06:00", "lun 07:00", "30/06 23:00"), SIEMPRE en
  ART sin importar la TZ del navegador.
- **KPI tiles clickeables** (paquete UX 2026-06-10): filtran la tabla por estado (Programadas /
  En pausa / Sin programar; "Tablas" o re-click = quitar filtro). El filtro se compone con el de
  nombre; el empty state del filtro trae botón "Quitar filtro".
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
  selección se ve por el **resaltado** (tinte sky) + un **círculo de check** al inicio de la fila
  (paquete UX 2026-06-10: ancla visual de "acá se selecciona"; el badge muestra un **lápiz al
  hover** para diferenciar que él EDITA). La fila es focusable (Tab + Enter/Espacio) con
  `aria-label` + `aria-selected`. El badge frena la propagación. "Seleccionar todas / Quitar
  selección" (en edición: "Incluir todas / Quitar todas") es un **botón de texto** en la cabecera
  "Tabla" y opera sobre las VISIBLES.
- **Resaltado de filas en edición**: las filas de la programación que se edita se resaltan (tinte
  sky + acento gold a la izquierda en la 1ª celda). `TablesPanel` recibe `editingTables` (la
  membresía VIVA `App.editTables`) e `isEditing`; ver `TableRow` (`rowChecked`/`rowEditing`).
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
  estados de última actualización (✓/✗/spinner/—), crear/editar/eliminar en el rail + toggle
  habilitar, "Programar" con reasignación, skeletons de carga, empty states.
- **Paquete UX/UI 2026-06-10** (revisión completa pedida por el usuario; detalles en §4):
  `nextRunAt` + Próximas ejecuciones, historial con motivo de fallo (`/runs` + `lastRun.error`),
  pill de salud del scheduler en el header (`/health`), membresía editable en edición +
  stash/restore de la selección, pausa/reanudación al instante, KPI tiles-filtro, resumen como
  footer fijo del rail, círculo de check por fila + lápiz en el badge, aviso de reasignación con
  origen, flash de éxito, warning sub-hora, terminología "actualización", WelcomeGuide sin el
  hack `scale(0.75)`, headers de columna más compactos (64px, título `--fs-xl`), fix del stacking
  <1000px, `prefers-reduced-motion` en el spinner, y el kit RFDD pasado a **EB Garamond**.
- **Diseño RFDD aplicado a fondo** (pedido explícito de que "se note más"): tema en
  `src/index.css` (tokens navy/sky/gold/paper + fuentes EB Garamond/Source Serif/Inter), **barra superior navy**
  (`AppHeader`) con logo invertido (`filter: brightness(0) invert(1)`), **watermark de olas**
  (`pattern-waves.svg`) y eyebrow gold; patrón **eyebrow (gold tracked) + título serif** en los
  headers de ambos paneles; **tira de KPI tiles** (`KpiStrip`) con el resumen del modelo; contador
  de selección como chip sky. Assets en `src/components/AppHeader/` (logo + olas), emblema como
  `public/favicon.svg`.
- `npm run typecheck` y `npm run build` limpios. Build estático servible por nginx
  (`nginx.example.conf` incluido). Verificado en navegador real contra el backend.
- **Tests unitarios del front (Vitest, `npm run test`): 36, todo verde.** Cubren la lógica pura:
  `domain/frequency.ts` (`formatFrequency`, `scheduleTime`, `hourlyIntervalMinutes`, `formatHour`),
  `domain/time.ts` (`formatRelativeTime`, `formatNextRun`, `formatRunDuration`),
  `domain/report.ts` (`summarizeRuns`, `activityByDay`) y la validación
  `ScheduleForm/useScheduleForm.buildFrequency` (todas las frecuencias + bordes).
- **Pulido UX (paquete 3)**: la tabla tiene **filtro por nombre** (input en el encabezado de la
  columna, sin acentos/mayúsculas; "Seleccionar todas" opera sobre las VISIBLES sin pisar la
  selección de las ocultas; se resetea al cambiar de modelo vía `key={datasetId}`). La columna
  "Última actualización" muestra **cuándo fue** ("hace 2 h", `domain/time.ts`; el polling de 30s
  lo mantiene fresco). Los **errores del rail van arriba** (pegados al header donde vive el CTA).
  El copy del `WelcomeGuide` se corrigió (ya no menciona el selector de tipo de refresh
  eliminado).
- **Backend FastAPI (etapa A, ver §6.A): implementado en `backend/`.** Los 11 endpoints del
  contrato, JSON camelCase idéntico a `types.ts` (sin mapeo en `http-client.ts`), persistencia
  en archivo JSON, reasignación + invariante, validación de inputs. **Power BI-only**: requiere
  credenciales por `.env` (sin ellas no arranca). Probado de punta a punta con `TestClient` (con
  `FakeDataSource`, sin credenciales) y con uvicorn real. **Lecturas y listado de tablas (incl.
  fallback Scanner para RLS) verificados contra Power BI real** (2026-06-06/08).
- **Scheduler (etapa B, ver §6.B): implementado en `backend/`.** Worker en segundo plano que
  dispara los schedules a su hora (ART), **pollea** los refreshes asíncronos en vuelo y registra
  `lastRun` (`InProgress`→`Completed/Failed`, con timeout anti-colgados). Lógica de "próxima
  corrida" pura y testeada (`nextrun.py`), executor con protocolo `start`/`poll`. **Falta solo
  verificar el DISPARO del refresh end-to-end contra Power BI real** (nombres del header `Location`
  / strings de estado; ver §6.B).
- **Tooling**: ESLint (flat config, reglas de hooks de React) con `npm run lint`; **CI** en
  `.github/workflows/ci.yml` corre en cada push/PR a `main` el frontend (lint + typecheck + test +
  build) y el backend (pytest). Suite total: **77 pytest + 36 vitest**, todo verde sin credenciales.
- **Guía de deploy en `DEPLOY.md`** (pedida por el usuario 2026-06-10): VPS Hetzner desde cero —
  server + hardening SSH/ufw, stack, clone/build, `.env` y datos en `/var/lib/pbi`, systemd
  (`pbi-api`, 1 worker), nginx, verificación end-to-end y **WireGuard** como control de acceso
  (la app no tiene login: la VPN es la autenticación; nginx `allow 10.8.0.0/24` + cerrar 80/443).
  Incluye **checklist de seguridad** (§10): `PBI_CORS_ORIGINS` restrictivo en prod (el default es
  `*`), alcance mínimo del SP + admin APIs a un security group, rotación del secret, 2FA Hetzner,
  revocación de peers, y la limitación conocida de "sin identidad por usuario".

---

## 6. Detalle de implementación por etapa (A/B ✅) y lo que falta

### A) Backend FastAPI — ✅ HECHO (en `backend/`)

Implementa el contrato `ScheduleApi` (ver `src/api/client.ts`). El cliente
`src/api/http/http-client.ts` (única implementación, ya no un stub) usa estos endpoints
(baseUrl `/api`):

| Método | Endpoint | Body | Devuelve |
|---|---|---|---|
| GET | `/workspaces` | — | `Workspace[]` |
| GET | `/workspaces/{workspaceId}/datasets` | — | `Dataset[]` |
| GET | `/datasets/{datasetId}/tables` | — | `TableInfo[]` |
| GET | `/datasets/{datasetId}/schedules` | — | `Schedule[]` |
| GET | `/schedules/{id}/runs?limit=N` | — | `RunRecord[]` (historial, la más reciente primero; de `runs.jsonl`) |
| GET | `/report?limit=N` | — | `Report` (`{ schedules: {total,active,paused}, runs: ReportRun[] }`) — informe GLOBAL de la vista --INFORME-- |
| POST | `/schedules` | `CreateScheduleInput` | `ScheduleMutationResult` |
| PATCH | `/schedules/{id}` | `UpdateScheduleInput` | `ScheduleMutationResult` (acepta `tables`) |
| PUT | `/schedules/{id}/enabled` | `{ enabled }` | `ScheduleMutationResult` (switch "Habilitado" en edición) |
| DELETE | `/schedules/{id}` | — | `ScheduleMutationResult` |
| POST | `/schedules/{id}/run` | — | `ScheduleMutationResult` ("Ejecutar ahora"; 409 si ya corre, 503 sin scheduler) |

Además: los `Schedule` de toda respuesta llevan **`nextRunAt`** derivado (ISO ART; ausente si
está pausado; NUNCA se persiste — `routes._with_next_run` + `nextrun.display_next_run`), el
`lastRun` puede traer **`error`** (motivo del fallo) y el front consume **`GET /health`**
(`useHealth` → pill del header).

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

> ✅ **Lecturas verificadas contra Power BI real (2026-06-06/08)** con un service principal:
> auth client-credentials, `GET /workspaces`, `/datasets`, `/tables` (vía DAX `INFO.VIEW.TABLES()`,
> con **XMLA habilitado**, y el fallback Scanner para modelos con RLS). Las credenciales van en
> `backend/.env` (gitignored); `PBI_CLIENT_SECRET` es el **Value** del secret, no el *Secret ID*
> (un GUID → da `AADSTS7000215`). **Pendiente:** el disparo del refresh end-to-end (ver §6.B).

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
  `poll(schedule,token)->PollResult` (el refresh real es asíncrono). `PollResult = (status,
  error)`: además del estado, viaja el **motivo del fallo** que informe Power BI
  (`client.get_refresh_detail()` lo extrae de `messages` type=Error o `serviceExceptionJson`,
  truncado a 300 chars). `_map_status` traduce el estado de PBI a `RunStatus`.
- **Motivo de fallo en `lastRun.error`**: el scheduler registra POR QUÉ falló cada corrida
  (excepción al disparar vía `_short_error`, error informado por PBI, "superó el tiempo máximo"
  en timeout, "el servidor se reinició…" en `reconcile_orphans`) tanto en `lastRun` como en la
  línea de `runs.jsonl`. La UI lo muestra en el tooltip del ✗ y en el historial del rail.
- **Observabilidad**: los loggers `pbi.*` (scheduler/executor/powerbi) registran qué se dispara
  y el resultado de cada refresh (incluido el POST real con su HTTP status y `refreshId`); el
  setup está en `_configure_logging()` de `main.py`. Además, cada refresh **terminado** deja una
  línea en el **historial** `runs.jsonl` (`app/runlog.py`: append-only JSON Lines, thread-safe y
  **blindado** —si falla escribir, no corta el scheduler; `tail()` lo lee para
  `GET /schedules/{id}/runs`). `lastRun` (en `schedules.json`) guarda solo el ÚLTIMO run por
  schedule; `runs.jsonl` es el histórico completo.
- **Informe global (`GET /report`, vista --INFORME--)**: junta los **contadores** de
  programaciones (`store.all_schedules` → total/activas/en pausa) con las últimas N
  actualizaciones. Las **terminadas** salen de `runs.jsonl` (`runlog.tail_all`, orden por
  `finishedAt`/`startedAt` desc) y las **En curso** del scheduler en memoria
  (`scheduler.current_runs()`, status `InProgress` sin `finishedAt`); se mergean, ordenan desc y
  recortan a `limit`. Cada fila (`ReportRun`) se enriquece con el **nombre legible** de
  workspace/modelo (`routes._resolve_names`, best-effort vía la DataSource; si falla, cae al id —
  el record en disco solo guarda ids). `finishedAt` es opcional en `ReportRun` (las En curso no
  terminaron). El front lo pollea cada 15s (`useReport`) para que lo En curso se resuelva solo en
  pantalla. **OJO:** `runs.jsonl` arranca vacío (ningún refresh real terminó aún), así que la tabla
  está vacía hasta que corra/falle una actualización; los fallos SÍ se registran.
- **Health del scheduler**: el loop registra el último tick; `GET /health` devuelve
  `{ status, scheduler: { running, lastTickAt, healthy } }` (`healthy=False` si el hilo no corre o
  el último tick quedó viejo) → monitoreable desde el VPS aunque la API siga viva, y **visible en
  la UI** (pill del header vía `useHealth`).
- Config: `PBI_SCHEDULER_ENABLED` (true), `PBI_SCHEDULER_TICK_SECONDS` (30), `PBI_TZ_OFFSET_HOURS`
  (-3), `PBI_REFRESH_POLL_TIMEOUT_MIN` (120), `PBI_RUNS_LOG_PATH` (`runs.jsonl`), `PBI_LOG_LEVEL` (`INFO`).
- **Tests** (`backend/tests/`, `pip install -r requirements-dev.txt && pytest`): `nextrun` (todas las
  frecuencias y bordes, + `display_next_run`), scheduler con reloj controlado + executor falso
  (disparo, polling InProgress→Completed/Failed, timeout, no re-disparo en vuelo, serialización
  por dataset, captura del motivo de fallo), executor (mapeo de estados + propagación del error),
  cliente PBI (`get_refresh_detail` con messages/serviceExceptionJson), runlog (`tail` filtrado y
  `tail_all` global ordenado por fecha), los 11 endpoints (incl. `/runs`, `/report` con merge de
  En curso + nombres resueltos, y `nextRunAt` derivado/no persistido), y el health del scheduler.
  Corren **sin credenciales** con una `FakeDataSource` (`tests/_fixtures.py`). 77 tests, todo verde.
- **Validación de inputs (paquete "robustez")**: los modelos de input (`models.py`) validan rangos
  además de la UI (defensa en profundidad, porque la API no tiene auth): `time` "HH:mm",
  `startHour/endHour` 0–23 (y desde≤hasta), `daysOfWeek` 0–6, `dayOfMonth` 1–28 o -1, y ≥1 tabla
  (`CreateScheduleInput`/`UpdateScheduleInput`). `POST /schedules` además **rechaza con 400** las
  tablas que no existan en el modelo (si las tablas no se pueden leer por RLS, no bloquea).

> ⚠️ **Pendiente de verificar contra Power BI real:** el **disparo del refresh end-to-end**
> (`refresh_dataset` → leer el `refreshId` del header `Location`/`x-ms-request-id`, y los strings de
> estado `Unknown/Completed/Failed`). La **lógica** está implementada y testeada con cliente falso;
> solo falta confirmar los nombres de header/estado contra el servicio (son ajustes en
> `powerbi/client.py`). Las **lecturas y el listado de tablas** sí están verificados (2026-06-06/08).

### C) Mejoras conocidas (opcionales / fuera de alcance)
- **Autenticación** (login, sesión) — explícitamente fuera de alcance.
- **Concurrencia optimista** (409 si dos usuarios editan el mismo schedule): hoy es last-write-wins
  con 1 worker; aceptable a esta escala.
- **Candado de instancia única** (file lock) para blindar contra correr con `--workers >1`.
- **Tablas agrupadas por origen** (parsear el M de cada tabla) — analizado y descartado: se mantiene
  la funcionalidad **por tabla**. Ver historial del chat / memoria.

---

## 7. Referencia rápida: tipos de refresh

> La UI usa **siempre `full`** (decisión de §4). Esto es solo referencia conceptual.

`full` = trae datos + recalcula. `dataOnly` = solo trae datos, no recalcula. `calculate` = no trae
datos, solo recalcula lo derivado. (`dataOnly`/`calculate` siguen en el tipo `RefreshType` y los
acepta el backend, pero la UI no los ofrece, para evitar dejar visuales sin procesar.)

---

## 8. Comandos

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/ estático
npm run preview    # sirve dist/ para verificar
npm run typecheck  # tsc --noEmit (incluye chequeo de casing cross-platform)
npm run test       # vitest run (tests unitarios de la lógica pura del front)
npm run lint       # eslint (reglas de hooks de React + TS; sin reglas de formato)
```

Necesita el backend corriendo (`cd backend && ./run.sh`); Vite proxya `/api`→`:8000`. La única
variable del front es `VITE_API_PROXY_TARGET` (destino del proxy en dev; ver `.env.example`). La
config del backend va en `backend/.env` (prefijo `PBI_`).

---

## 9. Convenciones al trabajar acá

- Respetar el **seam**: no importar de `api/http` fuera de `src/api/` (la app usa `{ api }`).
- Mantener el **lenguaje de marca RFDD** (navy/sky/gold/paper, EB Garamond/Source Serif/Inter, labels en
  versalitas, sombras navy sutiles; ver §2 y `rfdd-design-system/`) y la **UI en español**.
- Cada nivel de navegación maneja **loading + empty + error** (vía `RemoteData`).
- Switches sobre uniones discriminadas se cierran con `assertNever` (exhaustividad).
- Componentes chicos y separados, un `.module.css` co-locado por componente.
