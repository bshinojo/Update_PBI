// Lógica PURA del informe (--INFORME--): resumen por estado y actividad por día.
// Sin acceso a red ni al DOM: recibe los runs y `now`, así se testea con reloj fijo.
import type { ReportRun } from '../api/types'

export interface RunSummary {
  total: number
  completed: number
  failed: number
  inProgress: number
  /** % de éxito sobre las TERMINADAS (completed / (completed + failed)), redondeado.
   *  null si todavía no hay ninguna terminada (no se puede afirmar una tasa). */
  successRate: number | null
}

/** Cuenta los runs por estado y deriva la tasa de éxito sobre las terminadas. */
export function summarizeRuns(runs: ReportRun[]): RunSummary {
  let completed = 0
  let failed = 0
  let inProgress = 0
  for (const r of runs) {
    if (r.status === 'Completed') completed++
    else if (r.status === 'Failed') failed++
    else inProgress++
  }
  const finished = completed + failed
  return {
    total: runs.length,
    completed,
    failed,
    inProgress,
    successRate: finished > 0 ? Math.round((completed / finished) * 100) : null,
  }
}

export interface DayActivity {
  /** Clave del día en ART (YYYY-MM-DD), para keys de React. */
  key: string
  /** Etiqueta corta del día de la semana (lun, mar, …). */
  label: string
  /** Completadas ese día. */
  ok: number
  /** Falladas ese día. */
  fail: number
}

// Los horarios del producto se leen SIEMPRE en ART (UTC-3, sin DST): para agrupar
// por día calendario hay que mirar el día de pared en ART, no el del navegador.
const ART_OFFSET_MIN = -180
const MINUTE_MS = 60_000
const DAY_MS = 86_400_000
const WEEKDAY_SHORT_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

function artWall(d: Date): Date {
  return new Date(d.getTime() + ART_OFFSET_MIN * MINUTE_MS)
}

function artDayKey(d: Date): string {
  const w = artWall(d)
  const y = w.getUTCFullYear()
  const m = String(w.getUTCMonth() + 1).padStart(2, '0')
  const day = String(w.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Actividad de los últimos `days` días (incluye hoy), en ART, de viejo a nuevo (apto
 * para dibujar de izquierda a derecha). Cada día cuenta Completadas (ok) y Falladas
 * (fail); las En curso no se cuentan (todavía no tienen desenlace). Usa finishedAt y
 * cae a startedAt si falta. Los runs fuera de la ventana se ignoran.
 */
export function activityByDay(runs: ReportRun[], days: number, now: Date): DayActivity[] {
  const buckets: DayActivity[] = []
  const index = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS)
    const key = artDayKey(d)
    index.set(key, buckets.length)
    buckets.push({ key, label: WEEKDAY_SHORT_ES[artWall(d).getUTCDay()], ok: 0, fail: 0 })
  }
  for (const r of runs) {
    if (r.status === 'InProgress') continue
    const ts = r.finishedAt ?? r.startedAt
    if (!ts) continue
    const t = new Date(ts)
    if (Number.isNaN(t.getTime())) continue
    const idx = index.get(artDayKey(t))
    if (idx === undefined) continue
    if (r.status === 'Completed') buckets[idx].ok++
    else if (r.status === 'Failed') buckets[idx].fail++
  }
  return buckets
}
