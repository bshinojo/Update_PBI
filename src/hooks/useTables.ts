import { useCallback } from 'react'
import { api } from '../api'
import type { Schedule, ScheduleMutationResult, TableInfo } from '../api/types'
import { useRemoteData } from './useRemoteData'

export interface DatasetTablesView {
  tables: TableInfo[]
  schedules: Schedule[]
}

export function useTables(datasetId: string | null) {
  const { state, refetch, setData } = useRemoteData<DatasetTablesView>(
    datasetId
      ? async () => {
          const [tables, schedules] = await Promise.all([
            api.listTables(datasetId),
            api.listSchedules(datasetId),
          ])
          return { tables, schedules }
        }
      : null,
    [datasetId],
  )

  /**
   * Aplica el resultado de una mutación a la vista local (sin refetch).
   * Reconstruye tablas y schedules a partir de las tablas devueltas, usando el
   * invariante "cada schedule tiene >= 1 tabla": los schedules que dejan de estar
   * referenciados (eliminados o vaciados por reasignación) desaparecen solos.
   */
  const applyMutation = useCallback(
    (result: ScheduleMutationResult) => {
      setData((current) => {
        const prevSchedules = current?.schedules ?? []

        const tablesBySchedule = new Map<string, string[]>()
        for (const t of result.tables) {
          if (!t.scheduleId) continue
          const arr = tablesBySchedule.get(t.scheduleId) ?? []
          arr.push(t.name)
          tablesBySchedule.set(t.scheduleId, arr)
        }
        const referenced = new Set(tablesBySchedule.keys())

        const byId = new Map<string, Schedule>()
        for (const s of prevSchedules) {
          if (referenced.has(s.id)) byId.set(s.id, s)
        }
        if (result.affected) byId.set(result.affected.id, result.affected)

        const schedules = [...byId.values()].map((s) => ({
          ...s,
          tables: tablesBySchedule.get(s.id) ?? s.tables,
        }))

        return { tables: result.tables, schedules }
      })
    },
    [setData],
  )

  return { state, refetch, applyMutation }
}
