import { describe, expect, it } from 'vitest'
import type { Frequency, HourlyFrequency } from '../api/types'
import {
  formatFrequency,
  formatHour,
  hourlyIntervalMinutes,
  scheduleTime,
} from './frequency'

describe('scheduleTime', () => {
  it('devuelve el horario para daily/weekly/monthly y "" para hourly', () => {
    expect(scheduleTime({ kind: 'daily', time: '06:00' })).toBe('06:00')
    expect(scheduleTime({ kind: 'weekly', daysOfWeek: [1], time: '07:30' })).toBe('07:30')
    expect(scheduleTime({ kind: 'monthly', dayOfMonth: 1, time: '01:00' })).toBe('01:00')
    expect(scheduleTime({ kind: 'hourly', everyHours: 4 })).toBe('')
  })
})

describe('hourlyIntervalMinutes', () => {
  it('prioriza everyMinutes, cae a everyHours*60, y default 60', () => {
    expect(hourlyIntervalMinutes({ kind: 'hourly', everyMinutes: 30 })).toBe(30)
    expect(hourlyIntervalMinutes({ kind: 'hourly', everyHours: 4 })).toBe(240)
    // Si vienen ambos, manda everyMinutes (sub-hora).
    expect(hourlyIntervalMinutes({ kind: 'hourly', everyHours: 4, everyMinutes: 15 })).toBe(15)
    // Ninguno -> 60.
    expect(hourlyIntervalMinutes({ kind: 'hourly' } as HourlyFrequency)).toBe(60)
  })
})

describe('formatHour', () => {
  it('formatea 0..23 como HH:00', () => {
    expect(formatHour(0)).toBe('00:00')
    expect(formatHour(9)).toBe('09:00')
    expect(formatHour(17)).toBe('17:00')
  })
})

describe('formatFrequency', () => {
  it('daily sin días y con días', () => {
    expect(formatFrequency({ kind: 'daily', time: '06:00' })).toBe('Diario 06:00')
    expect(formatFrequency({ kind: 'daily', time: '06:00', daysOfWeek: [1, 3, 5] })).toBe(
      'Diario 06:00 · Lun, Mié, Vie',
    )
    // Los 7 días = "todos los días" -> no se agrega el sufijo.
    expect(
      formatFrequency({ kind: 'daily', time: '06:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }),
    ).toBe('Diario 06:00')
  })

  it('compacta rangos de 3+ días consecutivos', () => {
    expect(formatFrequency({ kind: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], time: '06:00' })).toBe(
      'Semanal Lun–Vie 06:00',
    )
  })

  it('hourly: intervalo, franja y días', () => {
    expect(formatFrequency({ kind: 'hourly', everyHours: 4 })).toBe('Cada 4 hs')
    expect(formatFrequency({ kind: 'hourly', everyHours: 1 })).toBe('Cada hora')
    expect(formatFrequency({ kind: 'hourly', everyMinutes: 30 })).toBe('Cada 30 min')
    expect(
      formatFrequency({ kind: 'hourly', everyHours: 2, startHour: 9, endHour: 17 }),
    ).toBe('Cada 2 hs, de 09:00 a 17:00')
    expect(
      formatFrequency({ kind: 'hourly', everyHours: 1, daysOfWeek: [1, 3, 5] }),
    ).toBe('Cada hora, Lun, Mié, Vie')
  })

  it('weekly y monthly (incluye último día)', () => {
    expect(formatFrequency({ kind: 'weekly', daysOfWeek: [1], time: '07:30' })).toBe(
      'Semanal Lun 07:30',
    )
    expect(formatFrequency({ kind: 'monthly', dayOfMonth: 1, time: '01:00' })).toBe(
      'Mensual día 1 01:00',
    )
    expect(formatFrequency({ kind: 'monthly', dayOfMonth: -1, time: '23:00' })).toBe(
      'Mensual último día 23:00',
    )
  })

  it('es exhaustivo: cubre las 4 variantes de Frequency', () => {
    const kinds = ['daily', 'hourly', 'weekly', 'monthly']
    const samples: Frequency[] = [
      { kind: 'daily', time: '06:00' },
      { kind: 'hourly', everyHours: 4 },
      { kind: 'weekly', daysOfWeek: [1], time: '06:00' },
      { kind: 'monthly', dayOfMonth: 1, time: '06:00' },
    ]
    for (const f of samples) expect(typeof formatFrequency(f)).toBe('string')
    expect(samples.map((f) => f.kind)).toEqual(kinds)
  })
})
