import { describe, expect, it } from 'vitest'
import { LAST_DAY } from '../../domain/frequency'
import { ALL_WEEKDAY_VALUES } from '../../domain/labels'
import { buildFrequency, type FormState } from './useScheduleForm'

// FormState válido por defecto (espeja initFormState); cada test sobreescribe lo suyo.
function base(over: Partial<FormState> = {}): FormState {
  return {
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
    enabled: true,
    ...over,
  }
}

describe('buildFrequency · daily', () => {
  it('omite daysOfWeek cuando son todos los días', () => {
    const r = buildFrequency(base({ kind: 'daily' }))
    expect(r).toEqual({ ok: true, frequency: { kind: 'daily', time: '06:00' } })
  })

  it('incluye daysOfWeek (ordenados) cuando es un subconjunto', () => {
    const r = buildFrequency(base({ kind: 'daily', dailyDays: [5, 1, 3] }))
    expect(r.ok && r.frequency).toEqual({ kind: 'daily', time: '06:00', daysOfWeek: [1, 3, 5] })
  })

  it('error si no hay días o no hay horario', () => {
    expect(buildFrequency(base({ kind: 'daily', dailyDays: [] })).ok).toBe(false)
    expect(buildFrequency(base({ kind: 'daily', dailyTime: '' })).ok).toBe(false)
  })
})

describe('buildFrequency · hourly', () => {
  it('hora entera -> everyHours; sub-hora -> everyMinutes', () => {
    expect(buildFrequency(base({ kind: 'hourly', hourlyEvery: 240 }))).toEqual({
      ok: true,
      frequency: { kind: 'hourly', everyHours: 4 },
    })
    expect(buildFrequency(base({ kind: 'hourly', hourlyEvery: 30 }))).toEqual({
      ok: true,
      frequency: { kind: 'hourly', everyMinutes: 30 },
    })
  })

  it('omite franja/días cuando son el default (todo el día / todos)', () => {
    const r = buildFrequency(base({ kind: 'hourly', hourlyEvery: 60 }))
    expect(r.ok && r.frequency).toEqual({ kind: 'hourly', everyHours: 1 })
  })

  it('incluye franja y días cuando se restringen', () => {
    const r = buildFrequency(
      base({ kind: 'hourly', hourlyEvery: 120, hourlyStart: 9, hourlyEnd: 17, hourlyDays: [1, 3] }),
    )
    expect(r.ok && r.frequency).toEqual({
      kind: 'hourly',
      everyHours: 2,
      startHour: 9,
      endHour: 17,
      daysOfWeek: [1, 3],
    })
  })

  it('error: intervalo inválido, franja invertida, sin días', () => {
    expect(buildFrequency(base({ kind: 'hourly', hourlyEvery: 45 })).ok).toBe(false)
    expect(buildFrequency(base({ kind: 'hourly', hourlyStart: 18, hourlyEnd: 9 })).ok).toBe(false)
    expect(buildFrequency(base({ kind: 'hourly', hourlyDays: [] })).ok).toBe(false)
  })
})

describe('buildFrequency · weekly', () => {
  it('guarda un único día y el horario', () => {
    expect(buildFrequency(base({ kind: 'weekly', weeklyDay: 3, weeklyTime: '07:30' }))).toEqual({
      ok: true,
      frequency: { kind: 'weekly', daysOfWeek: [3], time: '07:30' },
    })
  })

  it('error sin horario', () => {
    expect(buildFrequency(base({ kind: 'weekly', weeklyTime: '' })).ok).toBe(false)
  })
})

describe('buildFrequency · monthly', () => {
  it('día numérico y último día del mes', () => {
    expect(buildFrequency(base({ kind: 'monthly', monthlyDay: 15 }))).toEqual({
      ok: true,
      frequency: { kind: 'monthly', dayOfMonth: 15, time: '06:00' },
    })
    expect(buildFrequency(base({ kind: 'monthly', monthlyDay: LAST_DAY }))).toEqual({
      ok: true,
      frequency: { kind: 'monthly', dayOfMonth: LAST_DAY, time: '06:00' },
    })
  })

  it('error con día fuera de rango', () => {
    expect(buildFrequency(base({ kind: 'monthly', monthlyDay: 40 })).ok).toBe(false)
  })
})
