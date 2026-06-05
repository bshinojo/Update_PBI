import type { RemoteData } from '../../api/remote-data'
import type { Dataset } from '../../api/types'
import { EmptyState } from '../common/EmptyState'
import { Skeleton } from '../common/Skeleton'
import styles from './DatasetList.module.css'

interface DatasetListProps {
  data: RemoteData<Dataset[]>
  selectedId: string | null
  onSelect: (id: string) => void
}

export function DatasetList({ data, selectedId, onSelect }: DatasetListProps) {
  return (
    <aside className={styles.panel}>
      <div className={styles.header}>Modelos</div>
      <div className={styles.body}>
        {data.status === 'idle' ? (
          <EmptyState
            title="Elegí un workspace"
            hint="Seleccioná un workspace para ver sus modelos."
          />
        ) : data.status === 'loading' ? (
          <Skeleton rows={4} />
        ) : data.status === 'error' ? (
          <div className={styles.error}>{data.error}</div>
        ) : data.data.length === 0 ? (
          <EmptyState title="Este workspace no tiene modelos" />
        ) : (
          <ul className={styles.list}>
            {data.data.map((ds) => (
              <li key={ds.id}>
                <button
                  type="button"
                  className={
                    ds.id === selectedId ? `${styles.item} ${styles.selected}` : styles.item
                  }
                  onClick={() => onSelect(ds.id)}
                  aria-current={ds.id === selectedId}
                >
                  {ds.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
