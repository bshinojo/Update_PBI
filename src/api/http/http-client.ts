// Cliente HTTP real contra el backend FastAPI (baseUrl '/api'). Implementa el
// contrato ScheduleApi; el backend ya responde en camelCase, así que no se mapea
// nada acá. Verificado end-to-end contra Power BI real.
import type { ScheduleApi } from '../client'
import { ApiError } from '../client'
import type {
  CreateScheduleInput,
  Dataset,
  Schedule,
  ScheduleMutationResult,
  TableInfo,
  UpdateScheduleInput,
  Workspace,
} from '../types'

export class HttpScheduleApi implements ScheduleApi {
  constructor(private readonly baseUrl: string = '/api') {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
    if (!res.ok) {
      throw new ApiError(`Error ${res.status} al llamar a ${path}`, res.status)
    }
    return (await res.json()) as T
  }

  listWorkspaces() {
    return this.request<Workspace[]>('/workspaces')
  }
  listDatasets(workspaceId: string) {
    return this.request<Dataset[]>(`/workspaces/${workspaceId}/datasets`)
  }
  listTables(datasetId: string) {
    return this.request<TableInfo[]>(`/datasets/${datasetId}/tables`)
  }
  listSchedules(datasetId: string) {
    return this.request<Schedule[]>(`/datasets/${datasetId}/schedules`)
  }
  createSchedule(input: CreateScheduleInput) {
    return this.request<ScheduleMutationResult>('/schedules', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }
  updateSchedule(id: string, patch: UpdateScheduleInput) {
    return this.request<ScheduleMutationResult>(`/schedules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  }
  setScheduleEnabled(id: string, enabled: boolean) {
    return this.request<ScheduleMutationResult>(`/schedules/${id}/enabled`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    })
  }
  deleteSchedule(id: string) {
    return this.request<ScheduleMutationResult>(`/schedules/${id}`, {
      method: 'DELETE',
    })
  }
}
