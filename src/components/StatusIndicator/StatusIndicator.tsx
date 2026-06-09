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

// Estado del último run: ✓ verde (Completado), ✗ rojo (Falló), ⟳ spinner (En curso),
// — si nunca corrió. Al lado, CUÁNDO fue ("hace 2 h"): el polling de schedules
// re-renderiza cada ~30s, así que el relativo se mantiene fresco solo.
export function StatusIndicator({ lastRun }: StatusIndicatorProps) {
  if (!lastRun) {
    return (
      <span className={styles.none} title="Sin corridas">
        —
      </span>
    )
  }

  const when = formatRelativeTime(lastRun.timestamp)
  const label = `Último refresh: ${RUN_STATUS_ES[lastRun.status]}${when ? ` · ${when}` : ''}`
  const { name, cls } = iconFor(lastRun.status)

  return (
    <span className={`${styles.indicator} ${cls}`} title={label}>
      <Icon name={name} title={label} />
      {when ? <span className={styles.when}>{when}</span> : null}
    </span>
  )
}
