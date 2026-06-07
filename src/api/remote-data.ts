// Estado de un dato asíncrono modelado como unión discriminada.
// Obliga a cada nivel de la UI a manejar loading + success + error
// (hace imposible "loading con datos viejos" o "error con datos").

export type RemoteData<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }

export const loading = (): RemoteData<never> => ({ status: 'loading' })
export const success = <T>(data: T): RemoteData<T> => ({ status: 'success', data })
export const failure = (error: string): RemoteData<never> => ({ status: 'error', error })

export function isSuccess<T>(
  rd: RemoteData<T>,
): rd is { status: 'success'; data: T } {
  return rd.status === 'success'
}
