import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Declaración mínima de `process` para tsc (el proyecto no usa @types/node a
// propósito; este config corre en Node, donde `process` existe en runtime).
declare const process: { env: Record<string, string | undefined> }

// base: './' -> assets con rutas relativas, servible desde cualquier ubicación de nginx.
// proxy: en dev (npm run dev), /api se redirige al backend FastAPI, así el mismo
// baseUrl '/api' del HttpScheduleApi funciona en dev y en producción (nginx).
// El destino se puede override con VITE_API_PROXY_TARGET (default localhost:8000).
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8000'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        // El backend expone las rutas sin el prefijo /api (igual que nginx con la
        // barra final en proxy_pass): /api/workspaces -> /workspaces.
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
