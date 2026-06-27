import type { ReportRun, RefreshType, RunStatus } from '../../api/types'
import { REFRESH_TYPE_ES, RUN_STATUS_ES } from '../../domain/labels'
import { formatRelativeTime, formatRunDuration } from '../../domain/time'
import { Icon, type IconName } from '../common/Icon'
import styles from './InformePanel.module.css'

function statusIcon(status: RunStatus): { name: IconName; cls: string } {
  switch (status) {
    case 'Completed':
      return { name: 'check', cls: styles.ok }
    case 'Failed':
      return { name: 'x', cls: styles.fail }
    case 'InProgress':
      return { name: 'spinner', cls: styles.progress }
  }
}

function refreshLabel(type: string): string {
  return REFRESH_TYPE_ES[type as RefreshType] ?? type
}

/**
 * Tabla de las últimas actualizaciones (las del informe ya vienen ordenadas por
 * fecha desc, las En curso primero). Una fila por actualización: estado, de dónde es
 * (modelo · workspace · tablas), tipo, cuándo y cuánto duró. Si falló y se conoce el
 * motivo, va en una línea aparte debajo del origen.
 */
export function RunsTable({ runs }: { runs: ReportRun[] }) {
  if (runs.length === 0) {
    return (
      <p className={styles.empty}>
        Todavía no hay actualizaciones registradas. Van a aparecer acá a medida que las
        programaciones corran (o se ejecuten a demanda).
      </p>
    )
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Estado</th>
            <th scope="col">Origen</th>
            <th scope="col">Tipo</th>
            <th scope="col">Cuándo</th>
            <th scope="col">Duración</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const { name, cls } = statusIcon(r.status)
            const when = r.finishedAt ?? r.startedAt
            const relative = formatRelativeTime(when)
            const duration =
              r.status === 'InProgress' || !r.finishedAt
                ? '—'
                : formatRunDuration(r.startedAt, r.finishedAt) || '—'
            const model = r.datasetName ?? r.datasetId
            const workspace = r.workspaceName ?? r.workspaceId
            const tablesText = r.tables.join(', ')
            const key = `${r.scheduleId}-${r.startedAt}-${r.refreshId ?? ''}`
            return (
              <tr key={key}>
                <td>
                  <span className={`${styles.status} ${cls}`}>
                    <Icon name={name} title={RUN_STATUS_ES[r.status]} />
                    <span className={styles.statusText}>{RUN_STATUS_ES[r.status]}</span>
                  </span>
                </td>
                <td>
                  <div className={styles.origin}>
                    <span className={styles.model}>{model}</span>
                    <span className={styles.workspace}>{workspace}</span>
                    <span className={styles.tables} title={tablesText}>
                      {r.tables.length === 1
                        ? tablesText
                        : `${r.tables.length} tablas: ${tablesText}`}
                    </span>
                    {r.status === 'Failed' && r.error ? (
                      <span className={styles.errorLine} title={r.error}>
                        {r.error}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className={styles.type}>{refreshLabel(r.refreshType)}</td>
                <td className={styles.when} title={when}>
                  {relative || when}
                </td>
                <td className={styles.duration}>{duration}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
