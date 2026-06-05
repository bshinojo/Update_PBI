// EL SEAM. Este es el contrato que hoy implementa el mock y mañana implementará
// el backend real (FastAPI). Componentes y hooks SOLO importan `api` (de index.ts)
// y los tipos; nunca tocan mock/ ni http/. Así el swap es una sola línea.
import type {
  CreateScheduleInput,
  Dataset,
  Schedule,
  ScheduleMutationResult,
  TableInfo,
  UpdateScheduleInput,
  Workspace,
} from './types'

export interface ScheduleApi {
  listWorkspaces(): Promise<Workspace[]>
  listDatasets(workspaceId: string): Promise<Dataset[]>
  listTables(datasetId: string): Promise<TableInfo[]>
  listSchedules(datasetId: string): Promise<Schedule[]>

  createSchedule(input: CreateScheduleInput): Promise<ScheduleMutationResult>
  updateSchedule(id: string, patch: UpdateScheduleInput): Promise<ScheduleMutationResult>
  setScheduleEnabled(id: string, enabled: boolean): Promise<ScheduleMutationResult>
  deleteSchedule(id: string): Promise<ScheduleMutationResult>

  /** Solo mock: restaura los datos sembrados (botón "Resetear demo"). Opcional. */
  resetDemo?(): Promise<void>
}

/** Error normalizado de la capa de API (el `status` imita un código HTTP). */
export class ApiError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
