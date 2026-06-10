import { useEffect, useMemo, useRef, useState } from 'react'
import { isSuccess } from './api/remote-data'
import type { Schedule, ScheduleMutationResult } from './api/types'
import { AppHeader } from './components/AppHeader/AppHeader'
import { ColumnHeader } from './components/common/ColumnHeader'
import { KpiStrip, type KpiItem } from './components/KpiStrip/KpiStrip'
import { SchedulePanel } from './components/ScheduleForm/SchedulePanel'
import { TablesPanel, type StatusFilter } from './components/TablesPanel/TablesPanel'
import { TopSelect } from './components/TopSelect/TopSelect'
import { UpcomingRuns } from './components/UpcomingRuns/UpcomingRuns'
import { WelcomeGuide } from './components/WelcomeGuide/WelcomeGuide'
import { formatFrequency } from './domain/frequency'
import { useDatasets } from './hooks/useDatasets'
import { useTables } from './hooks/useTables'
import { useWorkspaces } from './hooks/useWorkspaces'
import { SelectionProvider, useSelection } from './state/SelectionContext'
import styles from './App.module.css'

// Workspace sintético de bienvenida (no existe en Power BI): es la entrada por
// defecto. Muestra un instructivo en vez de tablas y no carga modelos.
const GENERAL_ID = '__general__'
const GENERAL_WORKSPACE = { id: GENERAL_ID, name: '--GENERAL--' }

/** Cuánto vive el mensaje de éxito del rail antes de esfumarse solo. */
const FLASH_MS = 6000

export default function App() {
  return (
    <SelectionProvider>
      <Shell />
    </SelectionProvider>
  )
}

function Shell() {
  const selection = useSelection()
  const workspaces = useWorkspaces()
  const isGeneral = selection.selectedWorkspaceId === GENERAL_ID
  // En "--GENERAL--" no hay modelos reales que cargar.
  const datasets = useDatasets(isGeneral ? null : selection.selectedWorkspaceId)
  const tables = useTables(isGeneral ? null : selection.selectedDatasetId)

  // Schedule que se está editando en el rail; null = "nueva programación".
  const [editing, setEditing] = useState<Schedule | null>(null)
  // Membresía EDITABLE de la programación en edición: en este modo, tocar una fila
  // agrega/quita la tabla de la programación (se guarda con "Guardar cambios").
  const [editTables, setEditTables] = useState<string[]>([])
  // Selección guardada al entrar a editar: un click en un badge no debe COSTARLE al
  // usuario las tablas que ya tenía tildadas (misclick típico: badge dentro de la
  // fila). "+ Nueva" (cancelar) la restaura; guardar/eliminar la descarta.
  const stashedChecksRef = useRef<string[] | null>(null)
  // Filtro de la tabla por estado, manejado por las KPI tiles del sidebar.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  // Mensaje de éxito de la última mutación (sobrevive al remount del rail).
  const [flash, setFlash] = useState<string | null>(null)

  // "--GENERAL--" siempre primero: es la entrada por defecto.
  const workspaceOptions = useMemo(
    () => [GENERAL_WORKSPACE, ...(isSuccess(workspaces.state) ? workspaces.state.data : [])],
    [workspaces.state],
  )
  // Filtramos por el workspace actual: al cambiar de workspace, `datasets.state`
  // todavía refleja el anterior por un render (el refetch corre en un effect, después
  // del render). Sin este filtro, el auto-select de abajo elegiría un dataset del
  // workspace viejo y la tabla mostraría el modelo equivocado.
  const datasetOptions = useMemo(
    () =>
      isSuccess(datasets.state)
        ? datasets.state.data.filter((d) => d.workspaceId === selection.selectedWorkspaceId)
        : [],
    [datasets.state, selection.selectedWorkspaceId],
  )

  // Auto-seleccionar el primer workspace y el primer modelo: arranca mostrando
  // tablas sin clicks previos.
  useEffect(() => {
    if (!selection.selectedWorkspaceId && workspaceOptions.length > 0) {
      selection.selectWorkspace(workspaceOptions[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceOptions, selection.selectedWorkspaceId])

  useEffect(() => {
    if (!selection.selectedDatasetId && datasetOptions.length > 0) {
      selection.selectDataset(datasetOptions[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetOptions, selection.selectedDatasetId])

  // Cambiar de modelo descarta la edición en curso, la selección guardada y el filtro.
  useEffect(() => {
    setEditing(null)
    setEditTables([])
    stashedChecksRef.current = null
    setStatusFilter('all')
  }, [selection.selectedDatasetId])

  // El flash se esfuma solo.
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), FLASH_MS)
    return () => clearTimeout(id)
  }, [flash])

  // Resumen del modelo para las KPIs del sidebar (presentacional, derivado del estado).
  const kpis = useMemo<KpiItem[] | null>(() => {
    if (!isSuccess(tables.state)) return null
    const view = tables.state.data
    if (view.tables.length === 0) return null
    const scheduleById = new Map(view.schedules.map((s) => [s.id, s]))
    let scheduled = 0
    let paused = 0
    let unscheduled = 0
    for (const t of view.tables) {
      if (!t.scheduleId) {
        unscheduled++
        continue
      }
      const s = scheduleById.get(t.scheduleId)
      if (s && s.enabled === false) paused++
      else scheduled++
    }
    return [
      { id: 'all', label: 'Tablas', value: view.tables.length, note: 'en el modelo' },
      { id: 'scheduled', label: 'Programadas', value: scheduled, note: 'activas', noteTone: 'pos' },
      {
        id: 'paused',
        label: 'En pausa',
        value: paused,
        note: 'pausadas',
        noteTone: paused > 0 ? 'warn' : 'muted',
      },
      {
        id: 'unscheduled',
        label: 'Sin programar',
        value: unscheduled,
        note: 'sin programación',
        noteTone: 'muted',
      },
    ]
  }, [tables.state])

  const checkedTableNames = [...selection.checkedTables]
  const targetTables = editing ? editTables : checkedTableNames

  // Tablas del objetivo actual que pertenecen a OTRA programación y se moverían,
  // con la etiqueta de su programación de origen (consentimiento informado).
  const reassignments = useMemo(() => {
    if (!isSuccess(tables.state)) return []
    const view = tables.state.data
    const byId = new Map(view.schedules.map((s) => [s.id, s]))
    const target = new Set(targetTables)
    const out: Array<{ table: string; from: string }> = []
    for (const t of view.tables) {
      if (!target.has(t.name) || !t.scheduleId) continue
      if (editing && t.scheduleId === editing.id) continue
      const s = byId.get(t.scheduleId)
      out.push({ table: t.name, from: s ? formatFrequency(s.frequency) : 'otra programación' })
    }
    return out
    // targetTables es derivado de editing/editTables/checkedTableNames.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.state, editing, editTables, selection.checkedTables])

  // Tocar una fila: en modo edición agrega/quita la tabla de la programación que se
  // edita; si no, selecciona/deselecciona para crear.
  function handleToggle(name: string) {
    if (editing) {
      setEditTables((prev) =>
        prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
      )
      return
    }
    selection.toggleTable(name)
  }
  function handleSetActive(names: string[]) {
    if (editing) {
      setEditTables(names)
      return
    }
    selection.setChecked(names)
  }

  // Editar un schedule existente: guarda la selección actual (para restaurarla si
  // el usuario cancela) y carga la membresía editable.
  function handleEditBadge(schedule: Schedule) {
    if (!editing && selection.checkedTables.size > 0) {
      stashedChecksRef.current = [...selection.checkedTables]
    }
    selection.clearChecks()
    setEditing(schedule)
    setEditTables([...schedule.tables])
  }

  // Salir del modo edición. `restoreChecks` = volver a la selección que el usuario
  // tenía antes de entrar (solo al CANCELAR; al guardar/eliminar se descarta).
  function exitEdit(restoreChecks: boolean) {
    setEditing(null)
    setEditTables([])
    if (restoreChecks && stashedChecksRef.current) {
      selection.setChecked(stashedChecksRef.current)
    }
    stashedChecksRef.current = null
  }

  function handleSaved(result: ScheduleMutationResult) {
    tables.applyMutation(result)
    if (result.affected === null) {
      setFlash('Programación eliminada.')
    } else if (editing) {
      setFlash('Cambios guardados.')
    } else {
      const n = result.affected.tables.length
      setFlash(`Programación creada para ${n} ${n === 1 ? 'tabla' : 'tablas'}.`)
    }
    if (editing) {
      exitEdit(false)
    } else {
      selection.clearChecks()
    }
  }

  // Resultado de acciones que NO salen del modo edición (Ejecutar ahora, pausar al
  // toque): además de refrescar la vista, actualiza el schedule en edición para que
  // el rail muestre el estado nuevo (lastRun / enabled / nextRunAt).
  function handleRan(result: ScheduleMutationResult) {
    tables.applyMutation(result)
    if (result.affected && editing && result.affected.id === editing.id) {
      setEditing(result.affected)
    }
  }

  return (
    <div className={styles.app}>
      <AppHeader />

      <main className={styles.layout}>
        <aside className={styles.sidebar}>
          <ColumnHeader eyebrow="Modelo" title="Workspace y modelo" />
          <div className={styles.sidebarBody}>
            <TopSelect
              label="Workspace"
              value={selection.selectedWorkspaceId}
              options={workspaceOptions}
              specialIds={[GENERAL_ID]}
              onChange={selection.selectWorkspace}
            />
            <TopSelect
              label="Modelo"
              value={selection.selectedDatasetId}
              options={datasetOptions}
              loading={!isGeneral && !!selection.selectedWorkspaceId && !isSuccess(datasets.state)}
              disabled={isGeneral || !selection.selectedWorkspaceId}
              onChange={selection.selectDataset}
            />
            {kpis ? (
              <div className={styles.sidebarKpis}>
                <span className={styles.sidebarKpisLabel}>Resumen del modelo</span>
                <KpiStrip
                  items={kpis}
                  activeId={statusFilter}
                  onSelect={(id) =>
                    setStatusFilter((prev) => (prev === id ? 'all' : (id as StatusFilter)))
                  }
                />
              </div>
            ) : null}
            {isSuccess(tables.state) ? (
              <UpcomingRuns schedules={tables.state.data.schedules} />
            ) : null}
          </div>
        </aside>

        {isGeneral ? (
          <section className={styles.welcomeArea}>
            <WelcomeGuide />
          </section>
        ) : (
          <>
            <TablesPanel
              key={selection.selectedDatasetId ?? 'none'}
              data={tables.state}
              checked={selection.checkedTables}
              editingTables={editTables}
              isEditing={editing !== null}
              statusFilter={statusFilter}
              onClearStatusFilter={() => setStatusFilter('all')}
              onToggle={handleToggle}
              onSetActive={handleSetActive}
              onEditBadge={handleEditBadge}
            />
            <SchedulePanel
              key={editing ? `edit-${editing.id}` : 'new'}
              editing={editing}
              editTables={editTables}
              workspaceId={selection.selectedWorkspaceId}
              datasetId={selection.selectedDatasetId}
              checkedTableNames={checkedTableNames}
              reassignments={reassignments}
              flash={flash}
              onSaved={handleSaved}
              onRan={handleRan}
              onCancelEdit={() => exitEdit(true)}
            />
          </>
        )}
      </main>
    </div>
  )
}
