# Programador de refreshes selectivos — Power BI

Herramienta interna para que los consultores programen **refreshes selectivos** de
modelos semánticos de Power BI (por tabla, con distinta frecuencia y tipo de refresh)
**sin escribir código**.

> **Frontend** (React + Vite) + **backend FastAPI** (en `backend/`). El frontend habla con
> el backend vía `/api`; el backend lee y dispara los refreshes contra **Power BI real**
> (REST API + XMLA) y corre un scheduler que ejecuta los schedules a su hora. Requiere
> credenciales de un service principal de Azure AD (ver `backend/README.md`).

## Stack

- React + Vite + TypeScript
- CSS Modules + design tokens (lenguaje de marca **RFDD**: navy/sky/gold/paper, EB Garamond +
  Source Serif 4 + Inter; ver `rfdd-design-system/`), sin frameworks de UI
- Sin router, sin librerías de estado ni de data-fetching: hooks propios sobre un tipo
  `RemoteData<T>`

## Requisitos

- Node 20 o superior (ver `.nvmrc`)

## Desarrollo (Windows)

El frontend necesita el backend corriendo (lee/escribe vía `/api`). En dos terminales:

```powershell
# 1) Backend (ver backend/README.md para el .env con credenciales)
cd backend; ./run.sh            # uvicorn en http://127.0.0.1:8000

# 2) Frontend (en la raíz del repo)
npm install
npm run dev
```

Vite imprime una URL (por defecto `http://localhost:5173`) y proxya `/api` → el backend en
`:8000` (ver `vite.config.ts`). El proyecto no usa rutas absolutas de Windows ni scripts
dependientes del SO, así que los mismos comandos funcionan en Linux/Mac.

### Variables de entorno (opcionales)

`VITE_API_PROXY_TARGET` cambia el destino del proxy `/api` en dev si el backend no está en
`http://127.0.0.1:8000` (ver `.env.example`). Las credenciales y la config del backend van
en `backend/.env` (prefijo `PBI_`, ver `backend/README.md`).

## Build de producción

```powershell
npm run build
```

Genera un sitio **estático** en `dist/` (HTML + JS + CSS), servible por cualquier
servidor de archivos. `npm run preview` lo levanta localmente para verificarlo.

`npm run typecheck` corre el chequeo de tipos (incluye consistencia de mayúsculas en los
imports, que es lo que más rompe al pasar de Windows a Linux).

## Servir el build en Linux con nginx (VPS Hetzner)

1. Copiá el contenido de `dist/` al servidor, por ejemplo a
   `/var/www/pbi-refresh-scheduler`.
2. Usá una config como la de `nginx.example.conf`. Lo importante es el
   `try_files ... /index.html` (la app es una SPA: cualquier ruta debe caer en
   `index.html`) y servirla en la **raíz** de un `location` (con `/` final). Como el build
   usa rutas relativas (`base: './'`), también funciona en un subdirectorio siempre que se
   sirva con su barra final.

```bash
sudo cp -r dist/* /var/www/pbi-refresh-scheduler/
sudo cp nginx.example.conf /etc/nginx/sites-available/pbi-refresh-scheduler
sudo ln -s /etc/nginx/sites-available/pbi-refresh-scheduler /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Estructura

```
src/
  api/           Capa de servicios (EL contrato). Componentes solo importan `api` + tipos.
    types.ts     Tipos de dominio (Workspace, Dataset, TableInfo, Schedule, Frequency...).
    client.ts    interface ScheduleApi + ApiError.
    index.ts     Expone `api` (HttpScheduleApi contra el backend FastAPI).
    http/        Cliente HTTP (baseUrl '/api'); el backend responde en camelCase, no se mapea nada.
  domain/        Lógica pura: frecuencias, etiquetas en español, assertNever.
  hooks/         useWorkspaces / useDatasets / useTables sobre useRemoteData.
  state/         SelectionContext (workspace/modelo elegidos + tablas tildadas).
  components/    AppHeader (con pill de salud del scheduler), TopSelect, TablesPanel,
                 KpiStrip (tiles-filtro), UpcomingRuns, ScheduleForm (rail, con historial
                 de corridas), ScheduleBadge, StatusIndicator, WelcomeGuide, y common/.

backend/         API FastAPI + scheduler (ver backend/README.md).
```

## Notas

- **Persistencia:** los schedules se guardan en el backend (`backend/schedules.json`).
- **Estado "En curso":** mientras un refresh está en vuelo se muestra *En curso* (spinner);
  el scheduler lo pollea y lo resuelve a *Completado* / *Falló* solo.
- **Próxima ejecución:** cada schedule muestra cuándo corre la próxima vez (`nextRunAt`,
  derivado por el backend); el sidebar lista las próximas 3 del modelo.
- **Fallos explicados:** si una actualización falla, el motivo queda en el tooltip del ✗ y
  en el historial del rail ("Últimas actualizaciones", de `backend/runs.jsonl`).
- **Salud del scheduler:** el header muestra "Programador activo/detenido/Sin conexión"
  (pollea `GET /health`); si el worker del VPS se cae, se ve en la UI.
