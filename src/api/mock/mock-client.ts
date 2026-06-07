// Implementación mock de ScheduleApi: agrega latencia y posibles fallos sobre
// el store. Los componentes nunca importan este archivo directamente.
import type { ScheduleApi } from '../client'
import type { CreateScheduleInput, UpdateScheduleInput } from '../types'
import { maybeFail, randomDelay } from './delay'
import * as store from './store'

export class MockScheduleApi implements ScheduleApi {
  async listWorkspaces() {
    await randomDelay()
    maybeFail('cargar los workspaces')
    return store.getWorkspaces()
  }

  async listDatasets(workspaceId: string) {
    await randomDelay()
    maybeFail('cargar los modelos')
    return store.getDatasets(workspaceId)
  }

  async listTables(datasetId: string) {
    await randomDelay()
    maybeFail('cargar las tablas')
    return store.getTables(datasetId)
  }

  async listSchedules(datasetId: string) {
    await randomDelay()
    maybeFail('cargar los schedules')
    return store.getSchedules(datasetId)
  }

  async createSchedule(input: CreateScheduleInput) {
    await randomDelay()
    maybeFail('crear el schedule')
    return store.createSchedule(input)
  }

  async updateSchedule(id: string, patch: UpdateScheduleInput) {
    await randomDelay()
    maybeFail('actualizar el schedule')
    return store.updateSchedule(id, patch)
  }

  async setScheduleEnabled(id: string, enabled: boolean) {
    await randomDelay()
    maybeFail('cambiar el estado del schedule')
    return store.setScheduleEnabled(id, enabled)
  }

  async deleteSchedule(id: string) {
    await randomDelay()
    maybeFail('eliminar el schedule')
    return store.deleteSchedule(id)
  }
}
