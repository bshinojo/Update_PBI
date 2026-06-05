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
- **CSS Modules + design tokens** en `src/index.css`. Estética **flat por ausencia**: no
  existen tokens de sombra ni gradiente; bordes 1px; selección = tinte sutil + borde acento;
  única animación = spinner. (Ver el bloque de reglas al inicio de `src/index.css`.)
- **UI 100% en español.**
- **Cross-platform (Windows dev → Linux/nginx):** `base: './'` en `vite.config.ts`,
  `forceConsistentCasingInFileNames` en `tsconfig.json`, `.gitattributes` con LF. Nada de
  paths absolutos de SO; imports siempre con `/`.
- **Sin auth y sin HTTP real todavía.**

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
  components/     Breadcrumb, WorkspaceList, DatasetList, TablesPanel(+TableRow),
                  ScheduleModal(+FrequencyFields, useScheduleForm), ScheduleBadge,
                  StatusIndicator, y primitivos en common/ (Modal, Icon, Skeleton, EmptyState)
  App.tsx         Layout (breadcrumb + grid 3 paneles) y orquestación del modal.
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

- **"Programar seleccionadas"** crea **UN** schedule que agrupa todas las tablas tildadas
  (`Schedule.tables: string[]`). Si una tabla ya tenía schedule, se **reasigna** (se quita del
  anterior; si el anterior queda vacío, se elimina) y el modal **avisa** qué tablas se mueven.
- **Persistencia** del mock en `localStorage` (botón "Resetear demo" restaura el seed).
- **Semanal** = multiselección de días + un horario; la semana se muestra **empezando por Lunes**.
- **Mensual** soporta "último día del mes" (`dayOfMonth: -1`), día numérico 1–28.
- **Zona horaria** fija, display-only: `ART (UTC-3)` (no se guarda por schedule).
- **Tipo de refresh** default = `full` (Completo). Ver tabla en sección 7.

---

## 5. Lo que YA está hecho (✅)

- Frontend completo: navegación drill-down (workspaces → modelos → tablas), badges de
  programación, estados de último run (✓/✗/spinner/—), modal crear/editar/eliminar + toggle
  habilitar, "Programar seleccionadas" con reasignación, skeletons de carga, empty states.
- Capa mock con datos sembrados (3 workspaces, 2–4 modelos, 4–8 tablas, 6 schedules variados),
  delays 300–600ms, fallos opcionales con `VITE_MOCK_FAIL=1`.
- `npm run typecheck` y `npm run build` limpios. Build estático servible por nginx
  (`nginx.example.conf` incluido). Verificado en navegador real (drill-down, modal, badges).

---

## 6. Lo que FALTA (próximos pasos, en orden)

### A) Backend FastAPI — prioridad

Implementar el contrato `ScheduleApi` (ver `src/api/client.ts`). El stub
`src/api/http/http-client.ts` ya espera estos endpoints (baseUrl por defecto `/api`):

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

Pasos:
1. Definir los modelos Pydantic espejando `src/api/types.ts` (la `Frequency` es una unión
   discriminada por `kind`; `time` lo deriva el backend con la lógica de `scheduleTime`, no lo
   manda el cliente). Si el backend usa snake_case, mapear en `http-client.ts`.
2. Implementar la misma lógica de **reasignación** y el invariante "cada schedule tiene ≥1 tabla"
   que hoy vive en `src/api/mock/store.ts` (es la referencia funcional).
3. Integrar con **Power BI**: listar workspaces/datasets/tablas vía REST API; ejecutar el
   refresh selectivo vía enhanced refresh API (lista de tablas + `refreshType`).
4. Completar `HttpScheduleApi`, poner `VITE_API_MODE=http`. **Ningún componente cambia.**

### B) Scheduler / ejecución real
- Cron/worker que dispare cada schedule habilitado a su hora (ART) y registre `lastRun`.

### C) Mejoras conocidas (opcionales)
- **"En curso" estático**: hoy las corridas sembradas en InProgress no se auto-resuelven (es un
  estado de demo del mock). Con backend real progresan solas; si se quiere en el mock, requiere
  una suscripción/poll del store.
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
- Mantener la **estética flat** (sin sombras/gradientes) y la **UI en español**.
- Cada nivel de navegación maneja **loading + empty + error** (vía `RemoteData`).
- Switches sobre uniones discriminadas se cierran con `assertNever` (exhaustividad).
- Componentes chicos y separados, un `.module.css` co-locado por componente.
