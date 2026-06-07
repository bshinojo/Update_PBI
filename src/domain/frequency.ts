// Lógica de dominio de las frecuencias: el sentinel "último día del mes",
// el `time` canónico, y el formateo a etiqueta en español para los badges.
import type { Frequency, HourlyFrequency } from '../api/types'
import { assertNever } from './assert-never'
import { WEEKDAYS_ES } from './labels'

/** "Último día del mes" se modela como dayOfMonth = -1. */
export const LAST_DAY = -1 as const

/** Opciones del intervalo "cada N" (en minutos), incluye sub-hora. */
export const HOURLY_INTERVALS: ReadonlyArray<{ minutes: number; label: string }> = [
  { minutes: 15, label: 'Cada 15 minutos' },
  { minutes: 20, label: 'Cada 20 minutos' },
  { minutes: 30, label: 'Cada 30 minutos' },
  { minutes: 60, label: 'Cada 1 hora' },
  { minutes: 120, label: 'Cada 2 horas' },
  { minutes: 180, label: 'Cada 3 horas' },
  { minutes: 240, label: 'Cada 4 horas' },
  { minutes: 360, label: 'Cada 6 horas' },
  { minutes: 480, label: 'Cada 8 horas' },
  { minutes: 720, label: 'Cada 12 horas' },
  { minutes: 1440, label: 'Cada 24 horas' },
]

/** Intervalo efectivo en minutos: prioriza everyMinutes, cae a everyHours*60. */
export function hourlyIntervalMinutes(frequency: HourlyFrequency): number {
  if (frequency.everyMinutes != null) return frequency.everyMinutes
  if (frequency.everyHours != null) return frequency.everyHours * 60
  return 60
}

/** "Cada 30 min" / "Cada hora" / "Cada 4 hs" según el intervalo en minutos. */
function formatInterval(minutes: number): string {
  if (minutes < 60) return `Cada ${minutes} min`
  if (minutes === 60) return 'Cada hora'
  if (minutes % 60 === 0) return `Cada ${minutes / 60} hs`
  return `Cada ${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

/** Rango válido del día del mes en el selector (más el sentinel LAST_DAY). */
export const MIN_DAY_OF_MONTH = 1
export const MAX_DAY_OF_MONTH = 28

function isLastDayOfMonth(dayOfMonth: number): boolean {
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

/** "HH:00" a partir de una hora 0..23 (para mostrar franjas horarias). */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

/** Etiqueta corta en español para el badge (p. ej. "Diario 06:00", "Cada 4 hs"). */
export function formatFrequency(frequency: Frequency): string {
  switch (frequency.kind) {
    case 'daily': {
      const days = frequency.daysOfWeek ? formatWeekdays(frequency.daysOfWeek) : ''
      return days && days !== 'todos los días'
        ? `Diario ${frequency.time} · ${days}`
        : `Diario ${frequency.time}`
    }
    case 'hourly': {
      const parts = [formatInterval(hourlyIntervalMinutes(frequency))]
      if (frequency.startHour != null && frequency.endHour != null) {
        parts.push(`de ${formatHour(frequency.startHour)} a ${formatHour(frequency.endHour)}`)
      }
      const days = frequency.daysOfWeek ? formatWeekdays(frequency.daysOfWeek) : ''
      if (days && days !== 'todos los días') parts.push(days)
      return parts.join(', ')
    }
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

/**
 * Abrevia una lista de días JS en orden Lunes-primero, compactando rangos
 * consecutivos de 3+ días: [1,2,3,4,5] -> "Lun–Vie"; [1,3,5] -> "Lun, Mié, Vie".
 */
function formatWeekdays(daysOfWeek: number[]): string {
  if (daysOfWeek.length === 0) return ''
  if (daysOfWeek.length === 7) return 'todos los días'
  const order = WEEKDAYS_ES.map((d) => d.value)
  const shortAt = (value: number) => WEEKDAYS_ES.find((d) => d.value === value)?.short ?? '?'
  const idxs = [...new Set(daysOfWeek)]
    .map((v) => order.indexOf(v))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)

  const groups: number[][] = []
  for (const i of idxs) {
    const last = groups[groups.length - 1]
    if (last && i === last[last.length - 1] + 1) last.push(i)
    else groups.push([i])
  }
  return groups
    .map((g) =>
      g.length >= 3
        ? `${shortAt(order[g[0]])}–${shortAt(order[g[g.length - 1]])}`
        : g.map((i) => shortAt(order[i])).join(', '),
    )
    .join(', ')
}
