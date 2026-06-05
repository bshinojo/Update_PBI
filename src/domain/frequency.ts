// Lógica de dominio de las frecuencias: el sentinel "último día del mes",
// el `time` canónico, y el formateo a etiqueta en español para los badges.
import type { Frequency } from '../api/types'
import { assertNever } from './assert-never'
import { WEEKDAYS_ES } from './labels'

/** "Último día del mes" se modela como dayOfMonth = -1. */
export const LAST_DAY = -1 as const

/** Rango válido del día del mes en el selector (más el sentinel LAST_DAY). */
export const MIN_DAY_OF_MONTH = 1
export const MAX_DAY_OF_MONTH = 28

export function isLastDayOfMonth(dayOfMonth: number): boolean {
  return dayOfMonth === LAST_DAY
}

/**
 * `time` canónico de una frecuencia. 'hourly' no tiene horario fijo -> "".
 * El API usa esto para derivar Schedule.time (espejo denormalizado).
 */
export function scheduleTime(frequency: Frequency): string {
  switch (frequency.kind) {
    case 'daily':
    case 'weekly':
    case 'monthly':
      return frequency.time
    case 'hourly':
      return ''
    default:
      return assertNever(frequency)
  }
}

/** Etiqueta corta en español para el badge (p. ej. "Diario 06:00", "Cada 4 hs"). */
export function formatFrequency(frequency: Frequency): string {
  switch (frequency.kind) {
    case 'daily':
      return `Diario ${frequency.time}`
    case 'hourly':
      return frequency.everyHours === 1
        ? 'Cada hora'
        : `Cada ${frequency.everyHours} hs`
    case 'weekly': {
      const days = formatWeekdays(frequency.daysOfWeek)
      return days ? `Semanal ${days} ${frequency.time}` : `Semanal ${frequency.time}`
    }
    case 'monthly':
      return isLastDayOfMonth(frequency.dayOfMonth)
        ? `Mensual último día ${frequency.time}`
        : `Mensual día ${frequency.dayOfMonth} ${frequency.time}`
    default:
      return assertNever(frequency)
  }
}

/** Abrevia una lista de días JS en orden Lunes-primero: "Lun, Mié, Vie". */
export function formatWeekdays(daysOfWeek: number[]): string {
  if (daysOfWeek.length === 0) return ''
  if (daysOfWeek.length === 7) return 'todos los días'
  const order = WEEKDAYS_ES.map((d) => d.value)
  return [...daysOfWeek]
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((v) => WEEKDAYS_ES.find((d) => d.value === v)?.short ?? '?')
    .join(', ')
}
