// Simula latencia de red y (opcionalmente) fallos, para que la UI ejercite
// sus estados de carga y de error sin un backend real.
import { ApiError } from '../client'

/** Espera un tiempo aleatorio (por defecto 300-600 ms). */
export function randomDelay(min = 300, max = 600): Promise<void> {
  const ms = Math.round(min + Math.random() * (max - min))
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const FAIL_ENABLED = import.meta.env.VITE_MOCK_FAIL === '1'
const FAIL_RATE = 0.35

/**
 * Si VITE_MOCK_FAIL=1, lanza un error con cierta probabilidad para poder ver
 * los estados de error en cada nivel de navegación. Apagado por defecto.
 */
export function maybeFail(action: string): void {
  if (FAIL_ENABLED && Math.random() < FAIL_RATE) {
    throw new ApiError(`Fallo simulado al ${action}.`, 500)
  }
}
