import type { MouseEvent } from 'react'
import type { Schedule } from '../../api/types'
import { formatFrequency } from '../../domain/frequency'
import { formatNextRun } from '../../domain/time'
import styles from './ScheduleBadge.module.css'

interface ScheduleBadgeProps {
  schedule?: Schedule
  onClick?: (e: MouseEvent) => void
}

// Badge de la frecuencia del schedule. "—" si no hay; atenuado + "(pausado)" si
// está deshabilitado; clickeable para editar/eliminar cuando existe. El lápiz al
// hover lo distingue de la fila (la fila selecciona; el badge EDITA).
export function ScheduleBadge({ schedule, onClick }: ScheduleBadgeProps) {
  if (!schedule) {
    return <span className={styles.none}>—</span>
  }

  const label = formatFrequency(schedule.frequency)
  const next = schedule.nextRunAt ? formatNextRun(schedule.nextRunAt) : ''
  const title = [
    `Editar programación (${label})`,
    next ? `Próxima ejecución: ${next}` : schedule.enabled ? '' : 'En pausa: no se ejecuta',
  ]
    .filter(Boolean)
    .join(' · ')
  const cls = [styles.badge, schedule.enabled ? '' : styles.disabled]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={cls} onClick={onClick} title={title}>
      <span className={styles.label}>{label}</span>
      {!schedule.enabled ? <span className={styles.paused}>(pausado)</span> : null}
      <svg
        className={styles.pencil}
        viewBox="0 0 24 24"
        width="11"
        height="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    </button>
  )
}
