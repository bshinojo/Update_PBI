import { describe, expect, it } from 'vitest'
import type { ReportRun } from '../api/types'
import { activityByDay, summarizeRuns } from './report'

// Reloj fijo en ART para tests deterministas (como los timestamps reales del backend).
const NOW = new Date('2026-06-09T12:00:00-03:00')

function run(partial: Partial<ReportRun>): ReportRun {
  return {
    scheduleId: 'sch-1',
    datasetId: 'ds-1',
    workspaceId: 'ws-1',
    tables: ['T'],
    refreshType: 'full',
    status: 'Completed',
    startedAt: '2026-06-09T06:00:00-03:00',
    finishedAt: '2026-06-09T06:01:00-03:00',
    ...partial,
  }
}

describe('summarizeRuns', () => {
  it('cuenta por estado y deriva la tasa de éxito sobre las terminadas', () => {
    const s = summarizeRuns([
      run({ status: 'Completed' }),
      run({ status: 'Completed' }),
      run({ status: 'Completed' }),
      run({ status: 'Failed' }),
      run({ status: 'InProgress', finishedAt: undefined }),
    ])
    expect(s.total).toBe(5)
    expect(s.completed).toBe(3)
    expect(s.failed).toBe(1)
    expect(s.inProgress).toBe(1)
    // 3 de 4 terminadas -> 75% (las En curso no cuentan para la tasa).
    expect(s.successRate).toBe(75)
  })

  it('successRate es null cuando no hay ninguna terminada', () => {
    const s = summarizeRuns([run({ status: 'InProgress', finishedAt: undefined })])
    expect(s.successRate).toBeNull()
    expect(s.inProgress).toBe(1)
  })

  it('lista vacía', () => {
    expect(summarizeRuns([])).toEqual({
      total: 0,
      completed: 0,
      failed: 0,
      inProgress: 0,
      successRate: null,
    })
  })
})

describe('activityByDay', () => {
  it('arma una ventana de N días en ART, de viejo a nuevo, incluyendo hoy', () => {
    const days = activityByDay([], 7, NOW)
    expect(days).toHaveLength(7)
    // El último bucket es hoy (2026-06-09 es martes).
    expect(days[6].key).toBe('2026-06-09')
    expect(days[6].label).toBe('mar')
    expect(days[0].key).toBe('2026-06-03')
  })

  it('agrupa completadas y falladas por día de pared ART e ignora En curso', () => {
    const days = activityByDay(
      [
        run({ status: 'Completed', finishedAt: '2026-06-09T06:01:00-03:00' }),
        run({ status: 'Completed', finishedAt: '2026-06-09T10:30:00-03:00' }),
        run({ status: 'Failed', finishedAt: '2026-06-09T11:00:00-03:00' }),
        run({ status: 'Completed', finishedAt: '2026-06-08T08:00:00-03:00' }),
        run({ status: 'InProgress', finishedAt: undefined }),
      ],
      7,
      NOW,
    )
    const today = days[6]
    expect(today.ok).toBe(2)
    expect(today.fail).toBe(1)
    const yesterday = days[5]
    expect(yesterday.ok).toBe(1)
    expect(yesterday.fail).toBe(0)
  })

  it('ignora runs fuera de la ventana', () => {
    const days = activityByDay(
      [run({ status: 'Completed', finishedAt: '2026-05-01T06:01:00-03:00' })],
      7,
      NOW,
    )
    expect(days.every((d) => d.ok === 0 && d.fail === 0)).toBe(true)
  })
})
