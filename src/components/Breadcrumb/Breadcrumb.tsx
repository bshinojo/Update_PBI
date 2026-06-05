import styles from './Breadcrumb.module.css'

interface BreadcrumbProps {
  workspaceName?: string
  datasetName?: string
  /** Volver a la raíz (deselecciona el workspace). */
  onRoot: () => void
  /** Volver al workspace (deselecciona el modelo). */
  onWorkspace: () => void
}

export function Breadcrumb({ workspaceName, datasetName, onRoot, onWorkspace }: BreadcrumbProps) {
  return (
    <nav className={styles.breadcrumb} aria-label="Navegación">
      <button
        type="button"
        className={styles.crumb}
        onClick={onRoot}
        disabled={!workspaceName}
      >
        Workspaces
      </button>

      {workspaceName ? (
        <>
          <span className={styles.sep} aria-hidden="true">
            ›
          </span>
          {datasetName ? (
            <button type="button" className={styles.crumb} onClick={onWorkspace}>
              {workspaceName}
            </button>
          ) : (
            <span className={styles.current}>{workspaceName}</span>
          )}
        </>
      ) : null}

      {datasetName ? (
        <>
          <span className={styles.sep} aria-hidden="true">
            ›
          </span>
          <span className={styles.current}>{datasetName}</span>
        </>
      ) : null}
    </nav>
  )
}
