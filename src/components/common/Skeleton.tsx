import styles from './common.module.css'

interface SkeletonProps {
  rows?: number
}

// Barras grises planas (sin shimmer/gradiente) para los estados de carga.
export function Skeleton({ rows = 4 }: SkeletonProps) {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={styles.skeletonRow}
          style={{ width: `${70 + ((i * 17) % 28)}%` }}
        />
      ))}
    </div>
  )
}
