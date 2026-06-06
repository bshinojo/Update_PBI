import styles from './KpiStrip.module.css'

export type KpiTone = 'pos' | 'warn' | 'muted' | 'gold'

export interface KpiItem {
  label: string
  value: number
  note?: string
  noteTone?: KpiTone
}

// Tira de KPI tiles al estilo del dashboard RFDD: tarjeta blanca con borde
// hairline + sombra navy sutil, label en versalitas, número grande Inter 700
// tabular y una nota semántica (como el "delta" de los KpiTile del kit).
export function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className={styles.strip}>
      {items.map((it) => (
        <div key={it.label} className={styles.tile}>
          <span className={styles.label}>{it.label}</span>
          <span className={styles.value}>{it.value}</span>
          {it.note ? (
            <span
              className={`${styles.note} ${it.noteTone ? styles[it.noteTone] : ''}`}
            >
              {it.note}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
