import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { isSuccess } from './api/remote-data'
import type { Schedule, ScheduleMutationResult } from './api/types'
import { SchedulePanel } from './components/ScheduleForm/SchedulePanel'
import { TablesPanel } from './components/TablesPanel/TablesPanel'
import { TopSelect } from './components/TopSelect/TopSelect'
import { useDatasets } from './hooks/useDatasets'
import { useTables } from './hooks/useTables'
import { useWorkspaces } from './hooks/useWorkspaces'
import { SelectionProvider, useSelection } from './state/SelectionContext'
import styles from './App.module.css'

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
  const datasets = useDatasets(selection.selectedWorkspaceId)
  const tables = useTables(selection.selectedDatasetId)

  // Schedule que se está editando en el rail; null = "nueva programación".
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [resetting, setResetting] = useState(false)

  const workspaceOptions = isSuccess(workspaces.state) ? workspaces.state.data : []
  const datasetOptions = isSuccess(datasets.state) ? datasets.state.data : []

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
      <header className={styles.topbar}>
        <div className={styles.selectors}>
          <TopSelect
            label="Workspace"
            value={selection.selectedWorkspaceId}
            options={workspaceOptions}
            loading={!isSuccess(workspaces.state)}
            onChange={selection.selectWorkspace}
          />
          <TopSelect
            label="Modelo"
            value={selection.selectedDatasetId}
            options={datasetOptions}
            loading={!!selection.selectedWorkspaceId && !isSuccess(datasets.state)}
            disabled={!selection.selectedWorkspaceId}
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

      <main className={styles.layout}>
        <TablesPanel
          data={tables.state}
          checked={selection.checkedTables}
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
    </div>
  )
}
