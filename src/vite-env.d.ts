/// <reference types="vite/client" />

// Variables de entorno tipadas (ver .env.example).
interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'http'
  readonly VITE_MOCK_FAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
