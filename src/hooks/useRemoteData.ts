import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api'
import type { RemoteData } from '../api/remote-data'
import { failure, loading, success } from '../api/remote-data'

export interface UseRemoteData<T> {
  state: RemoteData<T>
  /** Vuelve a pedir el dato al backend (pasa por loading). */
  refetch: () => void
  /** Actualiza el dato localmente, sin pedir al backend (para aplicar mutaciones). */
  setData: (updater: (current: T | undefined) => T) => void
}

/**
 * Carga un dato asíncrono y lo expone como RemoteData<T>.
 * - Si `loader` es null, queda en estado 'idle' (útil para niveles "gateados").
 * - Descarta respuestas obsoletas cuando cambian las deps o el componente se desmonta.
 */
export function useRemoteData<T>(
  loader: (() => Promise<T>) | null,
  deps: unknown[],
): UseRemoteData<T> {
  const [state, setState] = useState<RemoteData<T>>(
    loader ? loading() : { status: 'idle' },
  )
  const tokenRef = useRef(0)
  const dataRef = useRef<T | undefined>(undefined)

  const run = useCallback(() => {
    if (!loader) {
      setState({ status: 'idle' })
      return
    }
    const token = ++tokenRef.current
    setState(loading())
    loader()
      .then((data) => {
        if (tokenRef.current !== token) return
        dataRef.current = data
        setState(success(data))
      })
      .catch((err: unknown) => {
        if (tokenRef.current !== token) return
        const msg =
          err instanceof ApiError ? err.message : 'Ocurrió un error inesperado.'
        setState(failure(msg))
      })
    // `deps` define cuándo recrear el loader; loader se cierra sobre esas mismas deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
    return () => {
      // Invalida respuestas en vuelo al desmontar o cambiar deps.
      tokenRef.current++
    }
  }, [run])

  const setData = useCallback((updater: (current: T | undefined) => T) => {
    const next = updater(dataRef.current)
    dataRef.current = next
    setState(success(next))
  }, [])

  return { state, refetch: run, setData }
}
