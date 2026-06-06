import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { isSuccess } from './api/remote-data'
import type { Schedule, ScheduleMutationResult } from './api/types'
import { AppHeader } from './components/AppHeader/AppHeader'
import { SchedulePanel } from './components/ScheduleForm/SchedulePanel'
import { TablesPanel } from './components/TablesPanel/TablesPanel'
import { TopSelect } from './components/TopSelect/TopSelect'
import { WelcomeGuide } from './components/WelcomeGuide/WelcomeGuide'
import { useDatasets } from './hooks/useDatasets'
import { useTables } from './hooks/useTables'
import { useWorkspaces } from './hooks/useWorkspaces'
import { SelectionProvider, useSelection } from './state/SelectionContext'
import styles from './App.module.css'

// Workspace sintético de bienvenida (no existe en Power BI): es la entrada por
// defecto. Muestra un instructivo en vez de tablas y no carga modelos.
const GENERAL_ID = '__general__'
const GENERAL_WORKSPACE = { id: GENERAL_ID, name: '--GENERAL--' }

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
  const [resetting, setResetting] = useState(false)

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

  // Cambiar de modelo descarta la edición en curso.
  useEffect(() => {
    setEditing(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.selectedDatasetId])

  // Tablas del dataset actual que ya tienen schedule (para avisar reasignación al crear).
  const scheduledTableNames = useMemo(() => {
    const set = new Set<string>()
    if (isSuccess(tables.state)) {
      for (const t of tables.state.data.tables) if (t.scheduleId) set.add(t.name)
    }
    return set
  }, [tables.state])

  const checkedTableNames = [...selection.checkedTables]
  const reassignTables = editing
    ? []
    : checkedTableNames.filter((n) => scheduledTableNames.has(n))

  // Tocar la selección de tablas sale del modo edición: la acción del rail pasa a
  // ser "programar las tildadas".
  function handleToggle(name: string) {
    setEditing(null)
    selection.toggleTable(name)
  }
  function handleSetChecked(names: string[]) {
    setEditing(null)
    selection.setChecked(names)
  }

  // Editar un schedule existente: limpia las tildadas para no mezclar la
  // selección "para crear" con lo que se está editando.
  function handleEditBadge(schedule: Schedule) {
    selection.clearChecks()
    setEditing(schedule)
  }

  function handleSaved(result: ScheduleMutationResult) {
    tables.applyMutation(result)
    selection.clearChecks()
    setEditing(null)
  }

  async function handleReset() {
    setResetting(true)
    try {
      await api.resetDemo?.()
      window.location.reload()
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className={styles.app}>
      <AppHeader />

      <header className={styles.topbar}>
        <div className={styles.selectors}>
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
        </div>
        <button
          type="button"
          className="btn"
          onClick={handleReset}
          disabled={resetting}
          title="Restaurar los datos de demostración"
        >
          {resetting ? 'Reseteando…' : 'Resetear demo'}
        </button>
      </header>

      {isGeneral ? (
        <main className={styles.layoutGeneral}>
          <WelcomeGuide />
        </main>
      ) : (
        <main className={styles.layout}>
          <TablesPanel
            data={tables.state}
            checked={selection.checkedTables}
            editingTables={editing ? editing.tables : []}
            onToggle={handleToggle}
            onSetChecked={handleSetChecked}
            onEditBadge={handleEditBadge}
          />
          <SchedulePanel
            key={editing ? `edit-${editing.id}` : 'new'}
            editing={editing}
            workspaceId={selection.selectedWorkspaceId}
            datasetId={selection.selectedDatasetId}
            checkedTableNames={checkedTableNames}
            reassignTables={reassignTables}
            onSaved={handleSaved}
            onCancelEdit={() => setEditing(null)}
          />
        </main>
      )}
    </div>
  )
}
