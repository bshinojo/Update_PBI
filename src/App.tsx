import { useMemo, useState } from 'react'
import { api } from './api'
import { isSuccess } from './api/remote-data'
import type { Schedule, ScheduleMutationResult } from './api/types'
import { Breadcrumb } from './components/Breadcrumb/Breadcrumb'
import { DatasetList } from './components/DatasetList/DatasetList'
import { ScheduleModal } from './components/ScheduleModal/ScheduleModal'
import type { ScheduleModalMode } from './components/ScheduleModal/ScheduleModal'
import { TablesPanel } from './components/TablesPanel/TablesPanel'
import { WorkspaceList } from './components/WorkspaceList/WorkspaceList'
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

  const [modalMode, setModalMode] = useState<ScheduleModalMode | null>(null)
  const [resetting, setResetting] = useState(false)

  const workspaceName = isSuccess(workspaces.state)
    ? workspaces.state.data.find((w) => w.id === selection.selectedWorkspaceId)?.name
    : undefined
  const datasetName = isSuccess(datasets.state)
    ? datasets.state.data.find((d) => d.id === selection.selectedDatasetId)?.name
    : undefined

  // Tablas del dataset actual que ya tienen schedule (para avisar reasignación al crear).
  const scheduledTableNames = useMemo(() => {
    const set = new Set<string>()
    if (isSuccess(tables.state)) {
      for (const t of tables.state.data.tables) if (t.scheduleId) set.add(t.name)
    }
    return set
  }, [tables.state])

  function openCreate() {
    if (!selection.selectedDatasetId || !selection.selectedWorkspaceId) return
    setModalMode({
      type: 'create',
      datasetId: selection.selectedDatasetId,
      workspaceId: selection.selectedWorkspaceId,
      tableNames: [...selection.checkedTables],
    })
  }

  function handleSaved(result: ScheduleMutationResult) {
    tables.applyMutation(result)
    selection.clearChecks()
    setModalMode(null)
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

  const reassignTables =
    modalMode && modalMode.type === 'create'
      ? modalMode.tableNames.filter((n) => scheduledTableNames.has(n))
      : undefined

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <Breadcrumb
          workspaceName={workspaceName}
          datasetName={datasetName}
          onRoot={() => selection.selectWorkspace(null)}
          onWorkspace={() => selection.selectDataset(null)}
        />
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
        <WorkspaceList
          data={workspaces.state}
          selectedId={selection.selectedWorkspaceId}
          onSelect={selection.selectWorkspace}
        />
        <DatasetList
          data={datasets.state}
          selectedId={selection.selectedDatasetId}
          onSelect={selection.selectDataset}
        />
        <TablesPanel
          data={tables.state}
          checked={selection.checkedTables}
          onToggle={selection.toggleTable}
          onSetChecked={selection.setChecked}
          onScheduleSelected={openCreate}
          onEditBadge={(schedule: Schedule) => setModalMode({ type: 'edit', schedule })}
        />
      </main>

      {modalMode ? (
        <ScheduleModal
          mode={modalMode}
          reassignTables={reassignTables}
          onSaved={handleSaved}
          onClose={() => setModalMode(null)}
        />
      ) : null}
    </div>
  )
}
