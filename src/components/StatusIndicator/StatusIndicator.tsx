import type { LastRun, RunStatus } from '../../api/types'
import { assertNever } from '../../domain/assert-never'
import { RUN_STATUS_ES } from '../../domain/labels'
import { formatRelativeTime } from '../../domain/time'
import { Icon, type IconName } from '../common/Icon'
import styles from './StatusIndicator.module.css'

interface StatusIndicatorProps {
  lastRun?: LastRun
}

function iconFor(status: RunStatus): { name: IconName; cls: string } {
  switch (status) {
    case 'Completed':
      return { name: 'check', cls: styles.ok }
    case 'Failed':
      return { name: 'x', cls: styles.fail }
    case 'InProgress':
      return { name: 'spinner', cls: styles.progress }
    default:
      return assertNever(status)
  }
}

// Estado de la última actualización: ✓ verde (Completado), ✗ rojo (Falló),
// ⟳ spinner (En curso), — si nunca corrió. Al lado, CUÁNDO fue ("hace 2 h"): el
// polling de schedules re-renderiza cada ~30s, así que el relativo se mantiene
// fresco solo. Si falló y el backend conoce el motivo, va en el tooltip (el
// detalle completo vive en el historial del rail).
export function StatusIndicator({ lastRun }: StatusIndicatorProps) {
  if (!lastRun) {
    return (
      <span className={styles.none} title="Sin actualizaciones todavía">
        —
      </span>
    )
  }

  const when = formatRelativeTime(lastRun.timestamp)
  const base = `Última actualización: ${RUN_STATUS_ES[lastRun.status]}${when ? ` · ${when}` : ''}`
  const label =
    lastRun.status === 'Failed' && lastRun.error ? `${base} — ${lastRun.error}` : base
  const { name, cls } = iconFor(lastRun.status)

  return (
    <span className={`${styles.indicator} ${cls}`} title={label}>
      <Icon name={name} title={label} />
      {when ? <span className={styles.when}>{when}</span> : null}
    </span>
  )
}
