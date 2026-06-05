import styles from './common.module.css'

interface EmptyStateProps {
  title: string
  hint?: string
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyTitle}>{title}</div>
      {hint ? <div className={styles.emptyHint}>{hint}</div> : null}
    </div>
  )
}
