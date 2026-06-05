import type { RemoteData } from '../../api/remote-data'
import type { Workspace } from '../../api/types'
import { EmptyState } from '../common/EmptyState'
import { Skeleton } from '../common/Skeleton'
import styles from './WorkspaceList.module.css'

interface WorkspaceListProps {
  data: RemoteData<Workspace[]>
  selectedId: string | null
  onSelect: (id: string) => void
}

export function WorkspaceList({ data, selectedId, onSelect }: WorkspaceListProps) {
  return (
    <aside className={styles.panel}>
      <div className={styles.header}>Workspaces</div>
      <div className={styles.body}>
        {data.status === 'idle' || data.status === 'loading' ? (
          <Skeleton rows={5} />
        ) : data.status === 'error' ? (
          <div className={styles.error}>{data.error}</div>
        ) : data.data.length === 0 ? (
          <EmptyState title="No hay workspaces" />
        ) : (
          <ul className={styles.list}>
            {data.data.map((ws) => (
              <li key={ws.id}>
                <button
                  type="button"
                  className={
                    ws.id === selectedId ? `${styles.item} ${styles.selected}` : styles.item
                  }
                  onClick={() => onSelect(ws.id)}
                  aria-current={ws.id === selectedId}
                >
                  {ws.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
