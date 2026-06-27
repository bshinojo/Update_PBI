import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Report } from '../api/types'

/** Cada cuánto se refresca el informe. Más corto que /health: queremos que una
 * actualización "En curso" se resuelva a Completado/Falló sola en pantalla. */
const POLL_MS = 15_000

export type ReportView =
  /** Primer fetch en vuelo (todavía sin datos). */
  | { kind: 'loading' }
  | { kind: 'success'; report: Report }
  | { kind: 'error' }

/**
 * Informe global para la vista --INFORME--: pollea GET /report en segundo plano.
 * Un poll fallido NO borra un informe ya en pantalla (se reintenta al próximo tick):
 * solo se muestra el error si todavía no hubo una respuesta exitosa.
 */
export function useReport(limit = 50): ReportView {
  const [view, setView] = useState<ReportView>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const report = await api.getReport(limit)
        if (!cancelled) setView({ kind: 'success', report })
      } catch {
        if (!cancelled) {
          setView((prev) => (prev.kind === 'success' ? prev : { kind: 'error' }))
        }
      }
    }

    void load()
    const id = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [limit])

  return view
}
