import { useReport } from '../../hooks/useReport'
import { ColumnHeader } from '../common/ColumnHeader'
import { Skeleton } from '../common/Skeleton'
import { ReportSummary } from './ReportSummary'
import { RunsTable } from './RunsTable'
import styles from './InformePanel.module.css'

/**
 * Vista --INFORME--: resumen visual de las actualizaciones (arriba) + tabla con las
 * últimas, más recientes primero (abajo). Ocupa las columnas 2-3 del layout (igual
 * que el instructivo de --GENERAL--). Se refresca solo (polling en useReport), así
 * lo que está "En curso" se resuelve a Completado/Falló en pantalla.
 */
export function InformePanel() {
  const view = useReport(50)

  return (
    <section className={styles.panel}>
      <ColumnHeader eyebrow="Informe" title="Últimas actualizaciones" />
      <div className={styles.body}>
        {view.kind === 'loading' ? (
          <div className={styles.loading}>
            <Skeleton rows={6} />
          </div>
        ) : view.kind === 'error' ? (
          <p className={styles.error}>
            No se pudo cargar el informe. Se reintenta solo en unos segundos.
          </p>
        ) : (
          <>
            <ReportSummary report={view.report} />
            <RunsTable runs={view.report.runs} />
          </>
        )}
      </div>
    </section>
  )
}
