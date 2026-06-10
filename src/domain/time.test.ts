import { describe, expect, it } from 'vitest'
import { formatNextRun, formatRelativeTime, formatRunDuration } from './time'

// Reloj fijo para que los tests sean deterministas (en ART, como los timestamps reales).
const NOW = new Date('2026-06-09T12:00:00-03:00')

describe('formatRelativeTime', () => {
  it('recién para menos de un minuto (incluye futuro por desfase de reloj)', () => {
    expect(formatRelativeTime('2026-06-09T11:59:40-03:00', NOW)).toBe('recién')
    expect(formatRelativeTime('2026-06-09T12:00:30-03:00', NOW)).toBe('recién')
  })

  it('minutos y horas', () => {
    expect(formatRelativeTime('2026-06-09T11:55:00-03:00', NOW)).toBe('hace 5 min')
    expect(formatRelativeTime('2026-06-09T10:00:00-03:00', NOW)).toBe('hace 2 h')
    expect(formatRelativeTime('2026-06-08T13:00:00-03:00', NOW)).toBe('hace 23 h')
  })

  it('ayer y días', () => {
    expect(formatRelativeTime('2026-06-08T11:00:00-03:00', NOW)).toBe('ayer')
    expect(formatRelativeTime('2026-06-06T11:00:00-03:00', NOW)).toBe('hace 3 días')
  })

  it('más de una semana: fecha corta', () => {
    expect(formatRelativeTime('2026-05-20T11:00:00-03:00', NOW)).toMatch(/2026/)
  })

  it('timestamp inválido: vacío (no rompe la UI)', () => {
    expect(formatRelativeTime('no-es-fecha', NOW)).toBe('')
  })
})

// NOW es martes 2026-06-09, 12:00 ART.
describe('formatNextRun', () => {
  it('hoy y mañana con horario', () => {
    expect(formatNextRun('2026-06-09T14:00:00-03:00', NOW)).toBe('hoy 14:00')
    expect(formatNextRun('2026-06-10T06:00:00-03:00', NOW)).toBe('mañana 06:00')
  })

  it('dentro de la semana: día abreviado', () => {
    expect(formatNextRun('2026-06-12T07:30:00-03:00', NOW)).toBe('vie 07:30') // viernes
    expect(formatNextRun('2026-06-15T06:00:00-03:00', NOW)).toBe('lun 06:00') // lunes próximo
  })

  it('más de una semana: fecha corta (con año si es otro)', () => {
    expect(formatNextRun('2026-06-30T23:00:00-03:00', NOW)).toBe('30/06 23:00')
    expect(formatNextRun('2027-01-05T06:00:00-03:00', NOW)).toBe('05/01/2027 06:00')
  })

  it('vencido o inválido: vacío (no afirma nada viejo)', () => {
    expect(formatNextRun('2026-06-09T10:00:00-03:00', NOW)).toBe('')
    expect(formatNextRun('no-es-fecha', NOW)).toBe('')
  })
})

describe('formatRunDuration', () => {
  it('segundos, minutos y horas', () => {
    expect(
      formatRunDuration('2026-06-09T06:00:00-03:00', '2026-06-09T06:00:32-03:00'),
    ).toBe('32 s')
    expect(
      formatRunDuration('2026-06-09T06:00:00-03:00', '2026-06-09T06:04:10-03:00'),
    ).toBe('4 min')
    expect(
      formatRunDuration('2026-06-09T06:00:00-03:00', '2026-06-09T07:12:00-03:00'),
    ).toBe('1 h 12 min')
    expect(
      formatRunDuration('2026-06-09T06:00:00-03:00', '2026-06-09T08:00:00-03:00'),
    ).toBe('2 h')
  })

  it('inválido o negativo: vacío', () => {
    expect(formatRunDuration('x', '2026-06-09T06:00:00-03:00')).toBe('')
    expect(
      formatRunDuration('2026-06-09T07:00:00-03:00', '2026-06-09T06:00:00-03:00'),
    ).toBe('')
  })
})
