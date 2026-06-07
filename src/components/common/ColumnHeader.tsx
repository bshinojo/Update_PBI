import type { ReactNode } from 'react'
import styles from './common.module.css'

interface ColumnHeaderProps {
  eyebrow: string
  title: string
  /** Acciones opcionales a la derecha (p. ej. los botones del rail). */
  actions?: ReactNode
}

// Encabezado uniforme de cada columna del layout (sidebar / tabla / rail): eyebrow
// gold en versalitas + título serif, con la MISMA altura en las 3 para que se
// entienda qué hace cada columna. `actions` va a la derecha del título.
export function ColumnHeader({ eyebrow, title, actions }: ColumnHeaderProps) {
  return (
    <header className={styles.colHeader}>
      <div className={styles.colHeading}>
        <span className={styles.colEyebrow}>{eyebrow}</span>
        <h2 className={styles.colTitle}>{title}</h2>
      </div>
      {actions ? <div className={styles.colActions}>{actions}</div> : null}
    </header>
  )
}
