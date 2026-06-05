// Punto único de selección del backend. Esta es LA línea que cambia al pasar
// del mock al backend real: el resto de la app importa `api` desde acá.
import type { ScheduleApi } from './client'
import { HttpScheduleApi } from './http/http-client'
import { MockScheduleApi } from './mock/mock-client'

const mode = import.meta.env.VITE_API_MODE ?? 'mock'

export const api: ScheduleApi =
  mode === 'http' ? new HttpScheduleApi() : new MockScheduleApi()

export { ApiError } from './client'
export type { ScheduleApi } from './client'
