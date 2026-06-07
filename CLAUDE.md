# CLAUDE.md

Guía para sesiones futuras de Claude Code en este repo. Resume la **idea total del
proyecto**, lo que **ya está hecho** y lo que **falta**.

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

> Por ahora **no hay backend, ni autenticación, ni llamadas HTTP reales**. El frontend
> corre 100% contra un mock en `localStorage`, detrás de una capa de servicios tipada
> pensada para que el swap a FastAPI **no toque ningún componente**.

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
  **mock, solo visual**. El **modo http real ya está cableado** (ver §6.A); el mock sigue
  disponible con `VITE_API_MODE=mock`.

---

## 3. Arquitectura (cómo está organizado)

```
src/
  api/            ← EL SEAM. Componentes/hooks importan SOLO `api` (de index.ts) + tipos.
    types.ts      Tipos de dominio (Workspace, Dataset, TableInfo, Schedule, Frequency...).
    client.ts     interface ScheduleApi (contrato) + class ApiError.
    remote-data.ts RemoteData<T> = idle | loading | success | error.
    index.ts      Selector: VITE_API_MODE === 'http' ? HttpScheduleApi : MockScheduleApi.
    mock/         seed.ts (datos), store.ts (localStorage + reasignación), mock-client.ts, delay.ts
    http/         http-client.ts → HttpScheduleApi (STUB que compila; falta el backend)
  domain/         Lógica pura: frequency.ts (LAST_DAY=-1, formatFrequency, scheduleTime),
                  labels.ts (textos español, semana Lunes-primero), assert-never.ts
  hooks/          useRemoteData (guard de respuestas obsoletas) → useWorkspaces/useDatasets/useTables
  state/          SelectionContext.tsx (reducer: workspace/dataset elegidos + tablas tildadas)
  components/     AppHeader (barra superior NAVY de marca RFDD: logo invertido + watermark de
                  olas + título serif "Programador de Actualizaciones" + cuenta mock + "Salir"),
                  TopSelect (selectores del header), TablesPanel(+TableRow),
                  KpiStrip (tira de KPI tiles del modelo: tablas/programadas/en pausa/sin programar),
                  ScheduleForm/ (SchedulePanel = rail lateral + FrequencyFields + useScheduleForm),
                  ScheduleBadge, StatusIndicator, y primitivos en common/ (Icon, Skeleton, EmptyState)
  App.tsx         Layout one-pager: AppHeader (marca + cuenta) + barra de selectores
                  (Workspace/Modelo) + grid [tabla | rail de programación a MEDIA pantalla,
                  `1fr 1fr`]. Auto-selecciona el primer workspace/modelo.
```

**Regla de oro del seam:** ningún archivo fuera de `src/api/` debe importar de `api/mock/` ni
`api/http/`. Solo se importa `{ api }` desde `src/api` y los tipos. Eso es lo que hace que el
swap a FastAPI sea una sola línea.

**Flujo de mutaciones:** las mutaciones del API devuelven `ScheduleMutationResult`
(`{ affected: Schedule|null, tables: TableInfo[] }`) y `useTables.applyMutation()` reconstruye
la vista local desde la respuesta (no hace un refetch a ciegas) — diseñado para sobrevivir a
un backend real con latencia.

---

## 4. Decisiones de producto ya tomadas (confirmadas con el usuario)

- **"Programar"** crea **UN** schedule que agrupa todas las tablas tildadas
  (`Schedule.tables: string[]`). Si una tabla ya tenía schedule, se **reasigna** (se quita del
  anterior; si el anterior queda vacío, se elimina) y el rail **avisa** qué tablas se mueven.
- **UI one-pager** (decidido con el usuario): sin drill-down ni modal. Workspace y Modelo son
  dos `select` en una barra de selectores; la tabla ocupa el ancho; el formulario de programación
  vive en un **rail fijo a la derecha que ocupa la mitad de la pantalla** (grid `1fr 1fr`; crear
  sobre las tildadas / editar al clickear un badge). Tocar la selección de tablas sale del modo edición.
- **Diseño RFDD** (pedido por el usuario): se adoptó el design system de la firma
  (`rfdd-design-system/`) en reemplazo de la estética flat. Detalles de tokens/tipos en §2.
- **Barra superior de marca (mock)**: `AppHeader` navy con logo RFDD, título serif
  **"Programador de Actualizaciones"** (sin subtítulo) y una **cuenta de ejemplo** (avatar con
  iniciales) + botón **"Salir"**. **Solo visual**: no hay auth/sesión.
- **Formulario de programación rediseñado** (pedido del usuario, "más vistoso y moderno"):
  segmented de frecuencia full-width (pill navy), tipo de refresh como **option-cards compactas
  de una línea** (la primera, Completo, marcada `(recomendado)` en gold), "Habilitado" como
  **toggle switch**, **tarjeta de Resumen en vivo** (acento gold), y el texto de tablas objetivo
  **integrado en el cuerpo** (tarjeta sutil / hint), ya no en una barra aislada. El CTA
  **"Programar"** vive en el **header del rail** (a la derecha del título, grande + sombra,
  deshabilitado si no hay tablas); en modo edición el footer tiene Eliminar / Guardar.
- **Panel izquierdo sin título**: se quitó el encabezado "Modelo / Tablas del modelo"; el
  `KpiStrip` encabeza directamente. Los **selectores Workspace/Modelo** (`TopSelect`) van
  destacados (grandes, valor en negrita navy, borde 1.5px) para que no pasen desapercibidos
  bajo la barra navy.
- **Resaltado de filas en edición**: al editar/seleccionar, las filas de esas tablas en la
  tabla izquierda se resaltan (tinte sky; las **en edición** con acento gold a la izquierda).
  `TablesPanel` recibe `editingTables` desde `App`; ver `TableRow` (`rowChecked`/`rowEditing`).
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
- **Persistencia** del mock en `localStorage` (botón "Resetear demo" restaura el seed).
- **Zona horaria** fija, display-only: `ART (UTC-3)` (no se guarda por schedule). La semana se
  muestra **empezando por Lunes**.
- **Tipo de refresh** default = `full` (Completo). Ver tabla en sección 7.

---

## 5. Lo que YA está hecho (✅)

- Frontend completo (layout **one-pager**: barra de marca RFDD + selectores Workspace/Modelo +
  tabla a todo el ancho + rail de programación a **media pantalla**), badges de programación,
  estados de último run (✓/✗/spinner/—), crear/editar/eliminar en el rail + toggle habilitar,
  "Programar" con reasignación, skeletons de carga, empty states.
- **Diseño RFDD aplicado a fondo** (pedido explícito de que "se note más"): tema en
  `src/index.css` (tokens navy/sky/gold/paper + fuentes Cormorant+Inter), **barra superior navy**
  (`AppHeader`) con logo invertido (`filter: brightness(0) invert(1)`), **watermark de olas**
  (`pattern-waves.svg`) y eyebrow gold; patrón **eyebrow (gold tracked) + título serif** en los
  headers de ambos paneles; **tira de KPI tiles** (`KpiStrip`) con el resumen del modelo; contador
  de selección como chip sky. Assets en `src/components/AppHeader/` (logo + olas), emblema como
  `public/favicon.svg`. Verificado por captura headless (typecheck + build limpios).
- Capa mock con datos sembrados (3 workspaces, 2–4 modelos, 4–8 tablas, 6 schedules variados),
  delays 300–600ms, fallos opcionales con `VITE_MOCK_FAIL=1`.
- `npm run typecheck` y `npm run build` limpios. Build estático servible por nginx
  (`nginx.example.conf` incluido). Verificado en navegador real (drill-down, modal, badges).
- **Backend FastAPI (etapa A, ver §6.A): implementado en `backend/`.** Los 8 endpoints del
  contrato, JSON camelCase idéntico a `types.ts` (sin mapeo en `http-client.ts`), persistencia
  en archivo JSON, reasignación + invariante portados de `store.ts`, credenciales de Power BI
  por `.env`. Modo `seed` por defecto (corre sin credenciales). Probado de punta a punta con
  `TestClient` y con uvicorn real. **Lecturas verificadas contra Power BI real (2026-06-06):**
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

Cómo quedó (ver `backend/README.md` para correr/deployar):
- **`backend/app/models.py`**: modelos Pydantic espejando `types.ts`, serializados en camelCase
  (`alias_generator`), `Frequency` como unión discriminada por `kind`. El `time` lo deriva el
  backend (`frequency.py`), no lo manda el cliente. **No hace falta mapear nada en `http-client.ts`.**
- **`backend/app/store.py`**: reasignación + invariante "cada schedule ≥1 tabla" (port fiel de
  `store.ts`), persistido en archivo JSON (`PBI_DB_PATH`, escritura atómica). Diferencia de diseño:
  las tablas NO guardan `scheduleId`; el universo de tablas lo da el `DataSource` y el `scheduleId`
  se DERIVA de los schedules en cada respuesta (sirve igual para seed y para Power BI).
- **`backend/app/datasource.py` + `powerbi/client.py`**: lecturas desde seed (default, sin
  credenciales) o desde Power BI (REST API + token client-credentials). El `PowerBIClient` ya
  tiene `refresh_dataset()` (enhanced refresh selectivo) listo para el scheduler.
- **Credenciales por `.env`** (prefijo `PBI_`, ver `backend/.env.example`): `PBI_DATA_SOURCE=seed|powerbi`,
  `PBI_TENANT_ID/CLIENT_ID/CLIENT_SECRET`, etc. Cambiar credenciales = editar `.env` y reiniciar.
- **Las rutas usan `response_model_exclude_none`**: omiten `scheduleId`/`lastRun`/`affected` cuando
  son `None`, así el JSON es idéntico al del mock (campos opcionales TS `?` ausentes). El front los
  trata por truthiness en ambos casos.

**Modo http ya cableado y VERIFICADO end-to-end** (sin navegador): se ejecutó el `HttpScheduleApi`
real (bundle esbuild) contra FastAPI corriendo — 12/12 (lecturas, crear/editar/pausar/eliminar,
reasignación, error 404, camelCase). En DEV: `cd backend && ./run.sh` + `VITE_API_MODE=http npm run dev`
(Vite proxya `/api`→backend, ver `vite.config.ts`). En PROD: nginx proxya `/api/`→backend.
**Ningún componente del front cambia.**

> ✅ **Lecturas verificadas contra Power BI real (2026-06-06)** con un service principal:
> auth client-credentials, `GET /workspaces`, `/datasets` y `/tables` (este último vía DAX
> `INFO.VIEW.TABLES()` — **XMLA está habilitado** en la capacidad de prueba), y `DELETE /schedules`.
> Falta sólo disparar un **refresh real** (ver §6.B). Las credenciales van en `backend/.env`
> (gitignored); `PBI_CLIENT_SECRET` es el **Value** del secret, no el *Secret ID* (un GUID → da
> `AADSTS7000215`).

### B) Scheduler / ejecución real — ✅ HECHO (en `backend/`), salvo el polling real de Power BI

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
- **`backend/app/executor.py`**: protocolo de dos fases `start(schedule)->token|None` y
  `poll(schedule,token)->RunStatus` (el refresh real es asíncrono). Seed: instantáneo por
  defecto, o simula N polls con `PBI_SEED_SIMULATE_REFRESH_TICKS`. PowerBI:
  `refresh_dataset()` (devuelve `refreshId`) + `get_refresh_status()`; `_map_status` traduce el
  estado de PBI a `RunStatus`.
- Config: `PBI_SCHEDULER_ENABLED` (true), `PBI_SCHEDULER_TICK_SECONDS` (30), `PBI_TZ_OFFSET_HOURS`
  (-3), `PBI_REFRESH_POLL_TIMEOUT_MIN` (120), `PBI_SEED_SIMULATE_REFRESH_TICKS` (0).
- **Tests** (`backend/tests/`, `pip install -r requirements-dev.txt && pytest`): `nextrun` (todas las
  frecuencias y bordes), scheduler con reloj controlado + executor falso (disparo, polling
  InProgress→Completed/Failed, timeout, no re-disparo en vuelo), executor (mapeo de estados +
  delegación al cliente con cliente falso), y los 8 endpoints. 35 tests, todo verde sin credenciales.

> ⚠️ Falta verificar el **refresh real** contra Power BI: de qué header sale el `refreshId`
> (`Location`/`x-ms-request-id`) y los strings de estado del refresh. Son ajustes de nombres en
> `powerbi/client.py`; la lógica de polling ya está testeada. (Las lecturas ya se verificaron el
> 2026-06-06, ver §6.A.)

### C) Mejoras conocidas (opcionales)
- **"En curso" estático del MOCK**: las corridas sembradas en InProgress del mock no se
  auto-resuelven (es un estado de demo del front). Con el backend real progresan solas; en seed se
  puede ver con `PBI_SEED_SIMULATE_REFRESH_TICKS>0`.
- **Autenticación** (login, sesión) — explícitamente fuera de alcance de la etapa 1.
- Updates optimistas, edición del set de tablas desde el modal de edición, "select-all" ya está.

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
```

Variables (ver `.env.example`): `VITE_API_MODE=mock|http`, `VITE_MOCK_FAIL=1` (forzar errores).

---

## 9. Convenciones al trabajar acá

- Respetar el **seam**: no importar de `api/mock`/`api/http` fuera de `src/api/`.
- Mantener el **lenguaje de marca RFDD** (navy/sky/gold/paper, Cormorant+Inter, labels en
  versalitas, sombras navy sutiles; ver §2 y `rfdd-design-system/`) y la **UI en español**.
- Cada nivel de navegación maneja **loading + empty + error** (vía `RemoteData`).
- Switches sobre uniones discriminadas se cierran con `assertNever` (exhaustividad).
- Componentes chicos y separados, un `.module.css` co-locado por componente.
