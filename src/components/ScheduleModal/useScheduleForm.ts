import { useReducer } from 'react'
import type { Frequency, FrequencyKind, RefreshType, Schedule } from '../../api/types'
import { assertNever } from '../../domain/assert-never'
import {
  LAST_DAY,
  MAX_DAY_OF_MONTH,
  MIN_DAY_OF_MONTH,
} from '../../domain/frequency'

// El estado del formulario espeja la unión Frequency pero guarda los campos de
// TODAS las frecuencias a la vez, así cambiar Diario -> Semanal -> Diario no pierde
// lo que el usuario ya había cargado.
export interface FormState {
  kind: FrequencyKind
  dailyTime: string
  everyHours: number
  weeklyDays: number[]
  weeklyTime: string
  monthlyDay: number // 1..28 o LAST_DAY
  monthlyTime: string
  refreshType: RefreshType
  enabled: boolean
}

type FormAction =
  | { type: 'patch'; patch: Partial<FormState> }
  | { type: 'toggleWeeklyDay'; value: number }

function initFormState(schedule?: Schedule): FormState {
  const base: FormState = {
    kind: 'daily',
    dailyTime: '06:00',
    everyHours: 4,
    weeklyDays: [1],
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
      break
    case 'hourly':
      state.everyHours = f.everyHours
      break
    case 'weekly':
      state.weeklyDays = [...f.daysOfWeek]
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
    case 'toggleWeeklyDay': {
      const set = new Set(state.weeklyDays)
      if (set.has(action.value)) set.delete(action.value)
      else set.add(action.value)
      return { ...state, weeklyDays: [...set] }
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
    case 'daily':
      if (!state.dailyTime) return { ok: false, errors: ['Elegí un horario.'] }
      return { ok: true, frequency: { kind: 'daily', time: state.dailyTime } }

    case 'hourly':
      if (!Number.isFinite(state.everyHours) || state.everyHours < 1 || state.everyHours > 24) {
        return { ok: false, errors: ['La cantidad de horas debe estar entre 1 y 24.'] }
      }
      return { ok: true, frequency: { kind: 'hourly', everyHours: Math.round(state.everyHours) } }

    case 'weekly': {
      const errors: string[] = []
      if (state.weeklyDays.length === 0) errors.push('Elegí al menos un día de la semana.')
      if (!state.weeklyTime) errors.push('Elegí un horario.')
      if (errors.length) return { ok: false, errors }
      return {
        ok: true,
        frequency: {
          kind: 'weekly',
          daysOfWeek: [...state.weeklyDays].sort((a, b) => a - b),
          time: state.weeklyTime,
        },
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
    toggleWeeklyDay: (value: number) => dispatch({ type: 'toggleWeeklyDay', value }),
    build: () => buildFrequency(state),
  }
}
