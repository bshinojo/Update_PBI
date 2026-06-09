import { useMemo, useState } from 'react'
import type { RemoteData } from '../../api/remote-data'
import type { Schedule } from '../../api/types'
import type { DatasetTablesView } from '../../hooks/useTables'
import { ColumnHeader } from '../common/ColumnHeader'
import { EmptyState } from '../common/EmptyState'
import { Skeleton } from '../common/Skeleton'
import { TableRow } from './TableRow'
import styles from './TablesPanel.module.css'

interface TablesPanelProps {
  data: RemoteData<DatasetTablesView>
  checked: ReadonlySet<string>
  /** Tablas de la programación que se está editando (para resaltarlas). */
  editingTables: string[]
  onToggle: (name: string) => void
  onSetChecked: (names: string[]) => void
  onEditBadge: (schedule: Schedule) => void
}

/** Comparación sin mayúsculas ni acentos ("categoria" encuentra "Categorías"). */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function TablesPanel({
  data,
  checked,
  editingTables,
  onToggle,
  onSetChecked,
  onEditBadge,
}: TablesPanelProps) {
  // El filtro es estado local de la columna; App remonta el panel al cambiar de
  // modelo (key={datasetId}), así que se resetea solo.
  const [filter, setFilter] = useState('')

  const editingSet = useMemo(() => new Set(editingTables), [editingTables])
  const scheduleById = useMemo(() => {
    const map = new Map<string, Schedule>()
    if (data.status === 'success') {
      for (const s of data.data.schedules) map.set(s.id, s)
    }
    return map
  }, [data])

  const tables = data.status === 'success' ? data.data.tables : []
  const needle = normalize(filter.trim())
  const visible = needle
    ? tables.filter((t) => normalize(t.name).includes(needle))
    : tables

  // "Seleccionar todas" opera sobre las tablas VISIBLES (respeta el filtro): agrega
  // o quita las visibles sin tocar la selección de las filas ocultas por el filtro.
  const visibleNames = visible.map((t) => t.name)
  const allVisibleChecked =
    visibleNames.length > 0 && visibleNames.every((n) => checked.has(n))
  function toggleAllVisible() {
    const next = new Set(checked)
    if (allVisibleChecked) for (const n of visibleNames) next.delete(n)
    else for (const n of visibleNames) next.add(n)
    onSetChecked([...next])
  }

  return (
    <section className={styles.panel}>
      <ColumnHeader
        eyebrow="Tablas"
        title="Tablas del modelo"
        actions={
          data.status === 'success' && tables.length > 0 ? (
            <input
              type="search"
              className={styles.filter}
              placeholder="Filtrar tablas…"
              aria-label="Filtrar tablas por nombre"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          ) : undefined
        }
      />

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
        ) : visible.length === 0 ? (
          <EmptyState
            title={`Sin resultados para “${filter.trim()}”`}
            hint="Probá con otro nombre o borrá el filtro."
          />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <span className={styles.thTabla}>
                    Tabla
                    <button
                      type="button"
                      className={styles.selectAll}
                      onClick={toggleAllVisible}
                    >
                      {allVisibleChecked ? 'Quitar selección' : 'Seleccionar todas'}
                    </button>
                  </span>
                </th>
                <th>Programación</th>
                <th className={styles.statusCol}>Último run</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <TableRow
                  key={t.name}
                  table={t}
                  schedule={t.scheduleId ? scheduleById.get(t.scheduleId) : undefined}
                  checked={checked.has(t.name)}
                  editing={editingSet.has(t.name)}
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
