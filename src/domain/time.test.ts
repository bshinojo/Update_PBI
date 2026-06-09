import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './time'

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
