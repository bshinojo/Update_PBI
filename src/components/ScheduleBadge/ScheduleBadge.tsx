import type { Schedule } from '../../api/types'
import { formatFrequency } from '../../domain/frequency'
import styles from './ScheduleBadge.module.css'

interface ScheduleBadgeProps {
  schedule?: Schedule
  onClick?: () => void
}

// Badge de la frecuencia del schedule. "—" si no hay; atenuado + "(pausado)" si
// está deshabilitado; clickeable para editar/eliminar cuando existe.
export function ScheduleBadge({ schedule, onClick }: ScheduleBadgeProps) {
  if (!schedule) {
    return <span className={styles.none}>—</span>
  }

  const label = formatFrequency(schedule.frequency)
  const cls = [styles.badge, schedule.enabled ? '' : styles.disabled]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      title={`Editar programación (${label})`}
    >
      <span className={styles.label}>{label}</span>
      {!schedule.enabled ? <span className={styles.paused}>(pausado)</span> : null}
    </button>
  )
}
