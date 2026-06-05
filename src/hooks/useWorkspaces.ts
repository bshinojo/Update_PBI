import { api } from '../api'
import type { Workspace } from '../api/types'
import { useRemoteData } from './useRemoteData'

export function useWorkspaces() {
  return useRemoteData<Workspace[]>(() => api.listWorkspaces(), [])
}
