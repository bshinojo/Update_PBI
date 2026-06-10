import { useEffect, useState } from 'react'
import { api } from '../api'
import type { RunRecord } from '../api/types'

export type RunsState =
  | { status: 'loading' }
  | { status: 'success'; runs: RunRecord[] }
  | { status: 'error' }

/**
 * Historial de corridas de un schedule (rail en modo edición). Se refresca cuando
 * cambia `refreshKey` (p. ej. el timestamp del lastRun: cuando una corrida termina,
 * el historial tiene una línea nueva). Guard de respuestas obsoletas incluido.
 */
export function useRuns(scheduleId: string, refreshKey?: string, limit = 5): RunsState {
  const [state, setState] = useState<RunsState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    api
      .listRuns(scheduleId, limit)
      .then((runs) => {
        if (!cancelled) setState({ status: 'success', runs })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [scheduleId, refreshKey, limit])

  return state
}
