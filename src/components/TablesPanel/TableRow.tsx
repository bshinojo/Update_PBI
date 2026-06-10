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
  /** El rail está en modo edición (la fila agrega/quita de esa programación). */
  isEditingMode?: boolean
  onToggle: () => void
  onEditBadge: (schedule: Schedule) => void
}

export function TableRow({
  table,
  schedule,
  checked,
  editing,
  isEditingMode,
  onToggle,
  onEditBadge,
}: TableRowProps) {
  const active = editing || checked
  const rowClass = [styles.row, editing ? styles.rowEditing : checked ? styles.rowChecked : '']
    .filter(Boolean)
    .join(' ')
  const label = isEditingMode
    ? `${editing ? 'Quitar' : 'Agregar'} ${table.name} ${editing ? 'de' : 'a'} la programación en edición`
    : `${checked ? 'Deseleccionar' : 'Seleccionar'} ${table.name}`
  // Toda la fila selecciona/deselecciona (se resalta al estar tildada). El círculo
  // de check al inicio ancla visualmente DÓNDE se selecciona (el badge, en cambio,
  // edita: frena la propagación y muestra su propio affordance de lápiz).
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
      aria-label={label}
      aria-selected={active}
    >
      <td className={styles.nameCell}>
        <span className={styles.nameWrap}>
          <span
            className={`${styles.checkmark} ${active ? styles.checkmarkOn : ''}`}
            aria-hidden="true"
          >
            {active ? (
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : null}
          </span>
          {table.name}
        </span>
      </td>
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
