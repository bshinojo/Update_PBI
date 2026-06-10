import styles from './KpiStrip.module.css'

export type KpiTone = 'pos' | 'warn' | 'muted' | 'gold'

export interface KpiItem {
  /** Identificador estable del tile (lo usa el filtro de la tabla). */
  id: string
  label: string
  value: number
  note?: string
  noteTone?: KpiTone
}

interface KpiStripProps {
  items: KpiItem[]
  /** Tile activo (filtro aplicado). 'all' = sin filtro. */
  activeId?: string
  /** Si está, los tiles son clickeables y filtran la tabla por estado. */
  onSelect?: (id: string) => void
}

// Tira de KPI tiles al estilo del dashboard RFDD: tarjeta blanca con borde
// hairline + sombra navy sutil, label en versalitas, número grande Inter 700
// tabular y una nota semántica. Con `onSelect`, cada tile además FILTRA la lista
// de tablas por su estado (click de nuevo = quitar el filtro).
export function KpiStrip({ items, activeId, onSelect }: KpiStripProps) {
  return (
    <div className={styles.strip}>
      {items.map((it) => {
        const active = activeId === it.id && it.id !== 'all'
        const content = (
          <>
            <span className={styles.label}>{it.label}</span>
            <span className={styles.value}>{it.value}</span>
            {it.note ? (
              <span className={`${styles.note} ${it.noteTone ? styles[it.noteTone] : ''}`}>
                {it.note}
              </span>
            ) : null}
          </>
        )
        if (!onSelect) {
          return (
            <div key={it.id} className={styles.tile}>
              {content}
            </div>
          )
        }
        return (
          <button
            type="button"
            key={it.id}
            className={`${styles.tile} ${styles.clickable} ${active ? styles.active : ''}`}
            aria-pressed={active}
            title={
              it.id === 'all'
                ? 'Quitar el filtro de la lista'
                : active
                  ? 'Quitar el filtro'
                  : `Ver solo las tablas "${it.label.toLowerCase()}"`
            }
            onClick={() => onSelect(it.id)}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
