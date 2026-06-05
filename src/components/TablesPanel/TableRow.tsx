import type { Schedule, TableInfo } from '../../api/types'
import { ScheduleBadge } from '../ScheduleBadge/ScheduleBadge'
import { StatusIndicator } from '../StatusIndicator/StatusIndicator'
import styles from './TablesPanel.module.css'

interface TableRowProps {
  table: TableInfo
  schedule?: Schedule
  checked: boolean
  onToggle: () => void
  onEditBadge: (schedule: Schedule) => void
}

export function TableRow({ table, schedule, checked, onToggle, onEditBadge }: TableRowProps) {
  return (
    <tr className={checked ? styles.rowChecked : undefined}>
      <td className={styles.checkCell}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Seleccionar ${table.name}`}
        />
      </td>
      <td className={styles.nameCell}>{table.name}</td>
      <td className={styles.badgeCell}>
        <ScheduleBadge
          schedule={schedule}
          onClick={schedule ? () => onEditBadge(schedule) : undefined}
        />
      </td>
      <td className={styles.statusCell}>
        <StatusIndicator lastRun={schedule?.lastRun} />
      </td>
    </tr>
  )
}
