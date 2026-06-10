// Textos en español y mapeos de etiquetas. Centralizar acá facilita
// traducir/ajustar y mantener una sola convención (p. ej. el orden de la semana).
import type { RefreshType, RunStatus } from '../api/types'

export const TIMEZONE_LABEL = 'ART (UTC-3)'

export interface WeekdayOption {
  /** Número de día JS (0=Domingo..6=Sábado) que se guarda en WeeklyFrequency.daysOfWeek. */
  value: number
  long: string
  short: string
}

// Ordenados empezando por Lunes (convención local), aunque el `value` use la
// numeración JS donde Domingo = 0.
export const WEEKDAYS_ES: WeekdayOption[] = [
  { value: 1, long: 'Lunes', short: 'Lun' },
  { value: 2, long: 'Martes', short: 'Mar' },
  { value: 3, long: 'Miércoles', short: 'Mié' },
  { value: 4, long: 'Jueves', short: 'Jue' },
  { value: 5, long: 'Viernes', short: 'Vie' },
  { value: 6, long: 'Sábado', short: 'Sáb' },
  { value: 0, long: 'Domingo', short: 'Dom' },
]

/** Todos los días JS, en orden Lunes-primero (default = "todos los días"). */
export const ALL_WEEKDAY_VALUES: number[] = WEEKDAYS_ES.map((d) => d.value)

// Convención de terminología: en la UI hablamos siempre de "actualización"
// (es el nombre del producto). "Refresh"/"run" quedan para el código y los logs.
export const REFRESH_TYPE_ES: Record<RefreshType, string> = {
  full: 'Completa',
  dataOnly: 'Solo datos',
  calculate: 'Recalcular',
}

export const REFRESH_TYPE_HINT_ES: Record<RefreshType, string> = {
  full: 'Procesa datos y recalcula el modelo.',
  dataOnly: 'Solo recarga datos, sin recalcular.',
  calculate: 'Solo recalcula (jerarquías, columnas y medidas).',
}

export const RUN_STATUS_ES: Record<RunStatus, string> = {
  Completed: 'Completado',
  Failed: 'Falló',
  InProgress: 'En curso',
}
