import { useEffect, useState } from 'react'
import { api } from '../api'

/** Cada cuánto se consulta /health para el indicador del header. */
const POLL_MS = 30_000

export type HealthView =
  /** Aún sin respuesta (primer fetch en vuelo). */
  | { kind: 'loading' }
  /** API viva y scheduler corriendo con ticks frescos. */
  | { kind: 'ok'; lastTickAt: string | null }
  /** API viva pero el worker no corre o se colgó: las programaciones NO disparan. */
  | { kind: 'scheduler-down'; lastTickAt: string | null }
  /** No se pudo hablar con el backend. */
  | { kind: 'api-down' }

/**
 * Salud del backend para el indicador del header: pollea GET /health en segundo
 * plano. La promesa del producto es "corre solo": si el proceso del VPS se cae,
 * esto lo hace visible en la UI en vez de que el usuario lo descubra por datos
 * viejos.
 */
export function useHealth(): HealthView {
  const [view, setView] = useState<HealthView>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const h = await api.getHealth()
        if (cancelled) return
        setView(
          h.scheduler.healthy
            ? { kind: 'ok', lastTickAt: h.scheduler.lastTickAt }
            : { kind: 'scheduler-down', lastTickAt: h.scheduler.lastTickAt },
        )
      } catch {
        if (!cancelled) setView({ kind: 'api-down' })
      }
    }

    void check()
    const id = setInterval(check, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return view
}
