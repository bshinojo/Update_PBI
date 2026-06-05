import { createContext, useContext, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'

interface SelectionState {
  selectedWorkspaceId: string | null
  selectedDatasetId: string | null
  checkedTables: ReadonlySet<string>
}

type SelectionAction =
  | { type: 'selectWorkspace'; workspaceId: string | null }
  | { type: 'selectDataset'; datasetId: string | null }
  | { type: 'toggleTable'; name: string }
  | { type: 'setChecked'; names: string[] }
  | { type: 'clearChecks' }

const initialState: SelectionState = {
  selectedWorkspaceId: null,
  selectedDatasetId: null,
  checkedTables: new Set(),
}

// Las transiciones son atómicas: elegir un workspace limpia el dataset Y los checks;
// elegir un dataset limpia los checks. Así nunca quedan tablas tildadas "fantasma"
// de un modelo anterior.
function reducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case 'selectWorkspace':
      if (action.workspaceId === state.selectedWorkspaceId) return state
      return {
        selectedWorkspaceId: action.workspaceId,
        selectedDatasetId: null,
        checkedTables: new Set(),
      }
    case 'selectDataset':
      if (action.datasetId === state.selectedDatasetId) return state
      return { ...state, selectedDatasetId: action.datasetId, checkedTables: new Set() }
    case 'toggleTable': {
      const next = new Set(state.checkedTables)
      if (next.has(action.name)) next.delete(action.name)
      else next.add(action.name)
      return { ...state, checkedTables: next }
    }
    case 'setChecked':
      return { ...state, checkedTables: new Set(action.names) }
    case 'clearChecks':
      if (state.checkedTables.size === 0) return state
      return { ...state, checkedTables: new Set() }
    default:
      return state
  }
}

interface SelectionContextValue extends SelectionState {
  selectWorkspace: (workspaceId: string | null) => void
  selectDataset: (datasetId: string | null) => void
  toggleTable: (name: string) => void
  setChecked: (names: string[]) => void
  clearChecks: () => void
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const value = useMemo<SelectionContextValue>(
    () => ({
      ...state,
      selectWorkspace: (workspaceId) => dispatch({ type: 'selectWorkspace', workspaceId }),
      selectDataset: (datasetId) => dispatch({ type: 'selectDataset', datasetId }),
      toggleTable: (name) => dispatch({ type: 'toggleTable', name }),
      setChecked: (names) => dispatch({ type: 'setChecked', names }),
      clearChecks: () => dispatch({ type: 'clearChecks' }),
    }),
    [state],
  )
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection debe usarse dentro de <SelectionProvider>')
  return ctx
}
