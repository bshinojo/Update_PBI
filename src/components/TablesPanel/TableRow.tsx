import type { Schedule, TableInfo } from '../../api/types'
import { ScheduleBadge } from '../ScheduleBadge/ScheduleBadge'
import { StatusIndicator } from '../StatusIndicator/StatusIndicator'
import styles from './TablesPanel.module.css'

interface TableRowProps {
  table: TableInfo
  schedule?: Schedule
  checked: boolean
  /** La tabla pertenece a la programación que se está editando. */
  editing?: boolean
  onToggle: () => void
  onEditBadge: (schedule: Schedule) => void
}

export function TableRow({
  table,
  schedule,
  checked,
  editing,
  onToggle,
  onEditBadge,
}: TableRowProps) {
  const rowClass = [styles.row, editing ? styles.rowEditing : checked ? styles.rowChecked : '']
    .filter(Boolean)
    .join(' ')
  // Toda la fila selecciona/deselecciona (se resalta al estar tildada). Sin checkbox:
  // acceso por teclado vía la fila (Enter/Espacio). El badge frena la propagación para
  // que editar una programación no cambie la selección.
  return (
    <tr
      className={rowClass}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      tabIndex={0}
      aria-label={`${checked ? 'Deseleccionar' : 'Seleccionar'} ${table.name}`}
    >
      <td className={styles.nameCell}>{table.name}</td>
      <td className={styles.badgeCell}>
        <ScheduleBadge
          schedule={schedule}
          onClick={
            schedule
              ? (e) => {
                  e.stopPropagation()
                  onEditBadge(schedule)
                }
              : undefined
          }
        />
      </td>
      <td className={styles.statusCell}>
        <StatusIndicator lastRun={schedule?.lastRun} />
      </td>
    </tr>
  )
}
