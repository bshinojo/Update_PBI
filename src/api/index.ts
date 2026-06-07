// Punto único de acceso al backend. La app importa `api` desde acá y nada más;
// la implementación concreta (HTTP contra FastAPI) queda encapsulada en http/.
import type { ScheduleApi } from './client'
import { HttpScheduleApi } from './http/http-client'

export const api: ScheduleApi = new HttpScheduleApi()

export { ApiError } from './client'
export type { ScheduleApi } from './client'
