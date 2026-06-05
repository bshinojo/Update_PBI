import { useMemo } from 'react'
import type { RemoteData } from '../../api/remote-data'
import type { Schedule } from '../../api/types'
import type { DatasetTablesView } from '../../hooks/useTables'
import { EmptyState } from '../common/EmptyState'
import { Skeleton } from '../common/Skeleton'
import { TableRow } from './TableRow'
import styles from './TablesPanel.module.css'

interface TablesPanelProps {
  data: RemoteData<DatasetTablesView>
  checked: ReadonlySet<string>
  onToggle: (name: string) => void
  onSetChecked: (names: string[]) => void
  onEditBadge: (schedule: Schedule) => void
}

export function TablesPanel({
  data,
  checked,
  onToggle,
  onSetChecked,
  onEditBadge,
}: TablesPanelProps) {
  const scheduleById = useMemo(() => {
    const map = new Map<string, Schedule>()
    if (data.status === 'success') {
      for (const s of data.data.schedules) map.set(s.id, s)
    }
    return map
  }, [data])

  const tables = data.status === 'success' ? data.data.tables : []
  const allNames = tables.map((t) => t.name)
  const allChecked = allNames.length > 0 && allNames.every((n) => checked.has(n))
  const indeterminate = !allChecked && allNames.some((n) => checked.has(n))

  return (
    <section className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.title}>Tablas</div>
        {checked.size > 0 ? (
          <div className={styles.count}>{checked.size} seleccionadas</div>
        ) : null}
      </div>

      <div className={styles.body}>
        {data.status === 'idle' ? (
          <EmptyState
            title="Elegí un modelo"
            hint="Seleccioná un modelo para ver y programar sus tablas."
          />
        ) : data.status === 'loading' ? (
          <Skeleton rows={6} />
        ) : data.status === 'error' ? (
          <div className={styles.error}>{data.error}</div>
        ) : tables.length === 0 ? (
          <EmptyState title="Este modelo no tiene tablas" />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkCol}>
                  <input
                    type="checkbox"
                    ref={(el) => {
                      if (el) el.indeterminate = indeterminate
                    }}
                    checked={allChecked}
                    onChange={() => onSetChecked(allChecked ? [] : allNames)}
                    aria-label="Seleccionar todas las tablas"
                  />
                </th>
                <th>Tabla</th>
                <th>Programación</th>
                <th className={styles.statusCol}>Último run</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <TableRow
                  key={t.name}
                  table={t}
                  schedule={t.scheduleId ? scheduleById.get(t.scheduleId) : undefined}
                  checked={checked.has(t.name)}
                  onToggle={() => onToggle(t.name)}
                  onEditBadge={onEditBadge}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
