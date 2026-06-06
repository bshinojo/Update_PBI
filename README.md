# Programador de refreshes selectivos — Power BI (frontend)

Herramienta interna para que los consultores programen **refreshes selectivos** de
modelos semánticos de Power BI (por tabla, con distinta frecuencia y tipo de refresh)
**sin escribir código**.

> Por ahora es **solo frontend**. No hay backend real ni autenticación: los datos son
> inventados y viven detrás de una capa de servicios tipada (`src/api/`) pensada para
> reemplazarse por un backend FastAPI **sin tocar componentes**.

## Stack

- React + Vite + TypeScript
- CSS Modules + design tokens (lenguaje de marca **RFDD**: navy/sky/gold/paper, Cormorant +
  Inter; ver `rfdd-design-system/`), sin frameworks de UI
- Sin router, sin librerías de estado ni de data-fetching: hooks propios sobre un tipo
  `RemoteData<T>`

## Requisitos

- Node 20 o superior (ver `.nvmrc`)

## Desarrollo (Windows)

```powershell
npm install
npm run dev
```

Vite imprime una URL (por defecto `http://localhost:5173`). El proyecto no usa rutas
absolutas de Windows ni scripts dependientes del SO, así que los mismos comandos
funcionan en Linux/Mac.

### Variables de entorno (opcionales)

Copiá `.env.example` a `.env` si querés cambiar algo:

- `VITE_API_MODE=mock` (default) — datos mock persistidos en `localStorage`, con delays
  simulados de 300–600 ms. `VITE_API_MODE=http` usaría el backend real (todavía no
  implementado: el cliente HTTP es un stub que compila).
- `VITE_MOCK_FAIL=1` — hace que el mock falle aleatoriamente, para ver los **estados de
  error** en cada nivel de navegación.

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
    index.ts     Selector mock|http (la única línea que cambia al ir a FastAPI).
    mock/        Datos sembrados + store en localStorage + cliente mock con delays.
    http/        Cliente HTTP real (stub que compila).
  domain/        Lógica pura: frecuencias, etiquetas en español, assertNever.
  hooks/         useWorkspaces / useDatasets / useTables sobre useRemoteData.
  state/         SelectionContext (navegación + tablas tildadas).
  components/    Breadcrumb, WorkspaceList, DatasetList, TablesPanel, ScheduleModal,
                 ScheduleBadge, StatusIndicator, y primitivos en common/.
```

## Notas

- **Persistencia:** los schedules que crees/edites se guardan en `localStorage`. El botón
  **"Resetear demo"** (arriba a la derecha) restaura los datos sembrados.
- **Estado "En curso":** algunas corridas vienen sembradas como *En curso* (spinner). Es
  un estado de demostración estático del mock; con un backend real progresaría solo.
- **Swap a FastAPI:** implementá `ScheduleApi` en `src/api/http/http-client.ts` (mapeando
  el formato del backend si hiciera falta) y poné `VITE_API_MODE=http`. Ningún componente
  cambia.
