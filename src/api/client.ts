// EL CONTRATO de la capa de API, implementado por HttpScheduleApi (http/) contra
// el backend FastAPI. Componentes y hooks SOLO importan `api` (de index.ts) y los
// tipos; nunca tocan http/ directamente.
import type {
  CreateScheduleInput,
  Dataset,
  HealthStatus,
  RunRecord,
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
  /** Historial de corridas terminadas del schedule (la más reciente primero). */
  listRuns(scheduleId: string, limit?: number): Promise<RunRecord[]>
  /** Salud del backend + su scheduler (para el indicador del header). */
  getHealth(): Promise<HealthStatus>

  createSchedule(input: CreateScheduleInput): Promise<ScheduleMutationResult>
  updateSchedule(id: string, patch: UpdateScheduleInput): Promise<ScheduleMutationResult>
  setScheduleEnabled(id: string, enabled: boolean): Promise<ScheduleMutationResult>
  deleteSchedule(id: string): Promise<ScheduleMutationResult>
  /** Dispara la actualización YA, fuera de su horario ("Ejecutar ahora"). */
  runScheduleNow(id: string): Promise<ScheduleMutationResult>
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
