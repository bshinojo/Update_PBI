import type { LastRun } from '../../api/types'
import { assertNever } from '../../domain/assert-never'
import { RUN_STATUS_ES } from '../../domain/labels'
import { Icon } from '../common/Icon'
import styles from './StatusIndicator.module.css'

interface StatusIndicatorProps {
  lastRun?: LastRun
}

// Estado del último run: ✓ verde (Completado), ✗ rojo (Falló), ⟳ spinner (En curso),
// — si nunca corrió. El switch es exhaustivo (assertNever).
export function StatusIndicator({ lastRun }: StatusIndicatorProps) {
  if (!lastRun) {
    return (
      <span className={styles.none} title="Sin corridas">
        —
      </span>
    )
  }

  const label = `Último refresh: ${RUN_STATUS_ES[lastRun.status]}`
  switch (lastRun.status) {
    case 'Completed':
      return (
        <span className={`${styles.indicator} ${styles.ok}`}>
          <Icon name="check" title={label} />
        </span>
      )
    case 'Failed':
      return (
        <span className={`${styles.indicator} ${styles.fail}`}>
          <Icon name="x" title={label} />
        </span>
      )
    case 'InProgress':
      return (
        <span className={`${styles.indicator} ${styles.progress}`}>
          <Icon name="spinner" title={label} />
        </span>
      )
    default:
      return assertNever(lastRun.status)
  }
}
