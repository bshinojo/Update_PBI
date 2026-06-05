import { api } from '../api'
import type { Dataset } from '../api/types'
import { useRemoteData } from './useRemoteData'

// `loader` es null hasta que hay un workspace elegido: el hook queda en 'idle'.
export function useDatasets(workspaceId: string | null) {
  return useRemoteData<Dataset[]>(
    workspaceId ? () => api.listDatasets(workspaceId) : null,
    [workspaceId],
  )
}
