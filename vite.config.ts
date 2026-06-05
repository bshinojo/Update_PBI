import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' -> assets con rutas relativas, servible desde cualquier ubicación de nginx.
export default defineConfig({
  base: './',
  plugins: [react()],
})
