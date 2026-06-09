import { useCallback, useEffect, useRef } from 'react'
import { api } from '../api'
import type { Schedule, ScheduleMutationResult, TableInfo } from '../api/types'
import { useRemoteData } from './useRemoteData'

export interface DatasetTablesView {
  tables: TableInfo[]
  schedules: Schedule[]
}

/** Cada cuánto se refresca el estado de los schedules (lastRun) en segundo plano. */
const POLL_MS = 30_000

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

  // El intervalo de polling necesita saber si hay datos cargados sin re-armarse en
  // cada render: ref espejo del estado.
  const hasDataRef = useRef(false)
  hasDataRef.current = state.status === 'success'

  /**
   * Polling EN SEGUNDO PLANO del estado de los schedules: el scheduler resuelve
   * InProgress -> Completed/Failed del lado del servidor, y sin esto la UI no se
   * entera hasta recargar. Solo pide /schedules (barato: lee el JSON local del
   * backend, no toca Power BI) y mergea sobre la vista actual sin pasar por
   * 'loading' (nada parpadea). Errores transitorios se ignoran: el próximo ciclo
   * reintenta.
   */
  useEffect(() => {
    if (!datasetId) return
    let cancelled = false
    const id = setInterval(async () => {
      if (!hasDataRef.current) return
      try {
        const schedules = await api.listSchedules(datasetId)
        // El cleanup corre al cambiar de dataset: una respuesta tardía del dataset
        // anterior no debe mezclarse con la vista del nuevo.
        if (cancelled) return
        setData((current) => (current ? { ...current, schedules } : { tables: [], schedules }))
      } catch {
        // Poll silencioso: un fallo transitorio no debe romper la vista.
      }
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [datasetId, setData])

  /**
   * Aplica el resultado de una mutación a la vista local (sin refetch).
   * Reconstruye tablas y schedules a partir de las tablas devueltas, usando el
   * invariante "cada schedule tiene >= 1 tabla": los schedules que dejan de estar
   * referenciados (eliminados o vaciados por reasignación) desaparecen solos.
   * Si la respuesta pertenece a OTRO dataset (el usuario cambió de modelo mientras
   * la mutación estaba en vuelo), se descarta: no debe pisar la vista actual.
   */
  const applyMutation = useCallback(
    (result: ScheduleMutationResult) => {
      const resultDataset = result.tables[0]?.datasetId ?? result.affected?.datasetId
      if (resultDataset && resultDataset !== datasetId) return

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
    [datasetId, setData],
  )

  return { state, refetch, applyMutation }
}
