import { useReducer } from 'react'
import type {
  DailyFrequency,
  Frequency,
  FrequencyKind,
  HourlyFrequency,
  RefreshType,
  Schedule,
} from '../../api/types'
import { assertNever } from '../../domain/assert-never'
import {
  HOURLY_INTERVALS,
  LAST_DAY,
  MAX_DAY_OF_MONTH,
  MIN_DAY_OF_MONTH,
  hourlyIntervalMinutes,
} from '../../domain/frequency'
import { ALL_WEEKDAY_VALUES } from '../../domain/labels'

// El estado del formulario espeja la unión Frequency pero guarda los campos de
// TODAS las frecuencias a la vez, así cambiar Diario -> Semanal -> Diario no pierde
// lo que el usuario ya había cargado.
export interface FormState {
  kind: FrequencyKind
  // Diario: horario + días (multi, default todos).
  dailyTime: string
  dailyDays: number[]
  // Cada N: intervalo en MINUTOS (15/20/30/60/...), franja y días (multi).
  hourlyEvery: number
  hourlyStart: number // 0..23
  hourlyEnd: number // 0..23
  hourlyDays: number[]
  // Semanal: UN solo día (elección única) + horario.
  weeklyDay: number
  weeklyTime: string
  // Mensual: día del mes + horario.
  monthlyDay: number // 1..28 o LAST_DAY
  monthlyTime: string
  refreshType: RefreshType
  enabled: boolean
}

type DayField = 'dailyDays' | 'hourlyDays'

type FormAction =
  | { type: 'patch'; patch: Partial<FormState> }
  | { type: 'toggleDay'; field: DayField; value: number }

function initFormState(schedule?: Schedule): FormState {
  const base: FormState = {
    kind: 'daily',
    dailyTime: '06:00',
    dailyDays: [...ALL_WEEKDAY_VALUES],
    hourlyEvery: 240,
    hourlyStart: 0,
    hourlyEnd: 23,
    hourlyDays: [...ALL_WEEKDAY_VALUES],
    weeklyDay: 1,
    weeklyTime: '06:00',
    monthlyDay: 1,
    monthlyTime: '06:00',
    refreshType: 'full',
    enabled: true,
  }
  if (!schedule) return base

  const state: FormState = {
    ...base,
    kind: schedule.frequency.kind,
    refreshType: schedule.refreshType,
    enabled: schedule.enabled,
  }
  const f = schedule.frequency
  switch (f.kind) {
    case 'daily':
      state.dailyTime = f.time
      state.dailyDays =
        f.daysOfWeek && f.daysOfWeek.length ? [...f.daysOfWeek] : [...ALL_WEEKDAY_VALUES]
      break
    case 'hourly':
      state.hourlyEvery = hourlyIntervalMinutes(f)
      state.hourlyStart = f.startHour ?? 0
      state.hourlyEnd = f.endHour ?? 23
      state.hourlyDays =
        f.daysOfWeek && f.daysOfWeek.length ? [...f.daysOfWeek] : [...ALL_WEEKDAY_VALUES]
      break
    case 'weekly':
      state.weeklyDay = f.daysOfWeek[0] ?? 1
      state.weeklyTime = f.time
      break
    case 'monthly':
      state.monthlyDay = f.dayOfMonth
      state.monthlyTime = f.time
      break
    default:
      assertNever(f)
  }
  return state
}

function reducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch }
    case 'toggleDay': {
      const set = new Set(state[action.field])
      if (set.has(action.value)) set.delete(action.value)
      else set.add(action.value)
      return { ...state, [action.field]: [...set] }
    }
    default:
      return state
  }
}

export type BuildResult =
  | { ok: true; frequency: Frequency }
  | { ok: false; errors: string[] }

// Construye la Frequency estricta a partir del formulario, o devuelve errores
// en español. Es el ÚNICO lugar donde vive la validación de frecuencia.
export function buildFrequency(state: FormState): BuildResult {
  switch (state.kind) {
    case 'daily': {
      const errors: string[] = []
      if (!state.dailyTime) errors.push('Elegí un horario.')
      if (state.dailyDays.length === 0) errors.push('Elegí al menos un día de la semana.')
      if (errors.length) return { ok: false, errors }
      const frequency: DailyFrequency = { kind: 'daily', time: state.dailyTime }
      if (state.dailyDays.length < ALL_WEEKDAY_VALUES.length) {
        frequency.daysOfWeek = [...state.dailyDays].sort((a, b) => a - b)
      }
      return { ok: true, frequency }
    }

    case 'hourly': {
      const errors: string[] = []
      if (!HOURLY_INTERVALS.some((o) => o.minutes === state.hourlyEvery)) {
        errors.push('Elegí un intervalo válido.')
      }
      if (state.hourlyStart > state.hourlyEnd) {
        errors.push('La hora "desde" no puede ser posterior a la "hasta".')
      }
      if (state.hourlyDays.length === 0) {
        errors.push('Elegí al menos un día de la semana.')
      }
      if (errors.length) return { ok: false, errors }

      const frequency: HourlyFrequency = { kind: 'hourly' }
      // Hora entera -> everyHours (shape clásico); sub-hora -> everyMinutes.
      if (state.hourlyEvery % 60 === 0) frequency.everyHours = state.hourlyEvery / 60
      else frequency.everyMinutes = state.hourlyEvery
      // window/días solo cuando NO son el default (todo el día / todos los días).
      if (!(state.hourlyStart === 0 && state.hourlyEnd === 23)) {
        frequency.startHour = state.hourlyStart
        frequency.endHour = state.hourlyEnd
      }
      if (state.hourlyDays.length < ALL_WEEKDAY_VALUES.length) {
        frequency.daysOfWeek = [...state.hourlyDays].sort((a, b) => a - b)
      }
      return { ok: true, frequency }
    }

    case 'weekly': {
      if (!state.weeklyTime) return { ok: false, errors: ['Elegí un horario.'] }
      return {
        ok: true,
        frequency: { kind: 'weekly', daysOfWeek: [state.weeklyDay], time: state.weeklyTime },
      }
    }

    case 'monthly': {
      const errors: string[] = []
      const validDay =
        state.monthlyDay === LAST_DAY ||
        (state.monthlyDay >= MIN_DAY_OF_MONTH && state.monthlyDay <= MAX_DAY_OF_MONTH)
      if (!validDay) errors.push('Elegí un día del mes válido (1 a 28, o último día).')
      if (!state.monthlyTime) errors.push('Elegí un horario.')
      if (errors.length) return { ok: false, errors }
      return {
        ok: true,
        frequency: { kind: 'monthly', dayOfMonth: state.monthlyDay, time: state.monthlyTime },
      }
    }

    default:
      return assertNever(state.kind)
  }
}

export function useScheduleForm(initial?: Schedule) {
  const [state, dispatch] = useReducer(reducer, initial, initFormState)
  return {
    state,
    patch: (patch: Partial<FormState>) => dispatch({ type: 'patch', patch }),
    toggleDailyDay: (value: number) => dispatch({ type: 'toggleDay', field: 'dailyDays', value }),
    toggleHourlyDay: (value: number) => dispatch({ type: 'toggleDay', field: 'hourlyDays', value }),
    build: () => buildFrequency(state),
  }
}
