import { useMemo, useState } from 'react'
import type { RemoteData } from '../../api/remote-data'
import type { Schedule } from '../../api/types'
import type { DatasetTablesView } from '../../hooks/useTables'
import { ColumnHeader } from '../common/ColumnHeader'
import { EmptyState } from '../common/EmptyState'
import { Skeleton } from '../common/Skeleton'
import { TableRow } from './TableRow'
import styles from './TablesPanel.module.css'

/** Filtro por estado que aplican las KPI tiles del sidebar. */
export type StatusFilter = 'all' | 'scheduled' | 'paused' | 'unscheduled'

interface TablesPanelProps {
  data: RemoteData<DatasetTablesView>
  checked: ReadonlySet<string>
  /** Membresía (editable) de la programación que se está editando. */
  editingTables: string[]
  /** true = modo edición: tocar una fila agrega/quita de la programación editada. */
  isEditing: boolean
  statusFilter: StatusFilter
  onClearStatusFilter: () => void
  onToggle: (name: string) => void
  /** Setea el conjunto ACTIVO completo (selección, o membresía en edición). */
  onSetActive: (names: string[]) => void
  onEditBadge: (schedule: Schedule) => void
}

/** Comparación sin mayúsculas ni acentos ("categoria" encuentra "Categorías"). */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

const STATUS_FILTER_LABEL: Record<Exclude<StatusFilter, 'all'>, string> = {
  scheduled: 'programadas (activas)',
  paused: 'en pausa',
  unscheduled: 'sin programar',
}

export function TablesPanel({
  data,
  checked,
  editingTables,
  isEditing,
  statusFilter,
  onClearStatusFilter,
  onToggle,
  onSetActive,
  onEditBadge,
}: TablesPanelProps) {
  // El filtro por nombre es estado local de la columna; App remonta el panel al
  // cambiar de modelo (key={datasetId}), así que se resetea solo.
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

  // El filtro de las KPI tiles (estado) se compone con el filtro por nombre.
  function matchesStatus(scheduleId: string | undefined): boolean {
    if (statusFilter === 'all') return true
    if (!scheduleId) return statusFilter === 'unscheduled'
    const s = scheduleById.get(scheduleId)
    const paused = s ? s.enabled === false : false
    return statusFilter === 'paused' ? paused : statusFilter === 'scheduled' ? !paused : false
  }

  const visible = tables.filter(
    (t) => (!needle || normalize(t.name).includes(needle)) && matchesStatus(t.scheduleId),
  )

  // Conjunto ACTIVO sobre el que opera la fila y el "Seleccionar todas": la
  // selección para crear, o la membresía de la programación en edición.
  const activeSet = isEditing ? editingSet : checked

  // "Seleccionar todas" opera sobre las tablas VISIBLES (respeta los filtros):
  // agrega o quita las visibles sin tocar las filas ocultas.
  const visibleNames = visible.map((t) => t.name)
  const allVisibleActive =
    visibleNames.length > 0 && visibleNames.every((n) => activeSet.has(n))
  function toggleAllVisible() {
    const next = new Set(activeSet)
    if (allVisibleActive) for (const n of visibleNames) next.delete(n)
    else for (const n of visibleNames) next.add(n)
    onSetActive([...next])
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
          statusFilter !== 'all' && !needle ? (
            <div className={styles.filterEmpty}>
              <EmptyState
                title={`No hay tablas ${STATUS_FILTER_LABEL[statusFilter]}`}
                hint="El filtro viene de las tarjetas del resumen, a la izquierda."
              />
              <button type="button" className="btn" onClick={onClearStatusFilter}>
                Quitar filtro
              </button>
            </div>
          ) : (
            <EmptyState
              title={`Sin resultados para “${filter.trim()}”`}
              hint={
                statusFilter !== 'all'
                  ? 'Probá con otro nombre o quitá los filtros (nombre y estado).'
                  : 'Probá con otro nombre o borrá el filtro.'
              }
            />
          )
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
                      {allVisibleActive
                        ? isEditing
                          ? 'Quitar todas'
                          : 'Quitar selección'
                        : isEditing
                          ? 'Incluir todas'
                          : 'Seleccionar todas'}
                    </button>
                  </span>
                </th>
                <th>Programación</th>
                <th className={styles.statusCol}>Última actualización</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <TableRow
                  key={t.name}
                  table={t}
                  schedule={t.scheduleId ? scheduleById.get(t.scheduleId) : undefined}
                  checked={!isEditing && checked.has(t.name)}
                  editing={isEditing && editingSet.has(t.name)}
                  isEditingMode={isEditing}
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
