import { useMemo } from 'react'
import type { Report } from '../../api/types'
import { activityByDay, summarizeRuns } from '../../domain/report'
import styles from './InformePanel.module.css'

const ACTIVITY_DAYS = 7

/**
 * Resumen visual del informe: contadores de programaciones (activas / en pausa),
 * tiles de estado de las actualizaciones (total / completadas / falladas / en curso
 * + tasa de éxito) y una mini barra de actividad de los últimos días.
 */
export function ReportSummary({ report }: { report: Report }) {
  const summary = useMemo(() => summarizeRuns(report.runs), [report.runs])
  const activity = useMemo(
    () => activityByDay(report.runs, ACTIVITY_DAYS, new Date()),
    [report.runs],
  )
  const maxDay = Math.max(1, ...activity.map((d) => d.ok + d.fail))
  const { schedules } = report

  return (
    <div className={styles.summary}>
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Programaciones</span>
          <div className={styles.bigRow}>
            <span className={styles.big}>{schedules.active}</span>
            <span className={styles.bigNote}>activas</span>
          </div>
          <span className={styles.cardFoot}>
            {schedules.paused} en pausa · {schedules.total} en total
          </span>
        </div>

        <div className={`${styles.card} ${styles.cardWide}`}>
          <span className={styles.cardLabel}>
            Actualizaciones{' '}
            <em className={styles.cardLabelHint}>(últimas {summary.total})</em>
          </span>
          <div className={styles.statTiles}>
            <Stat value={summary.completed} label="Completadas" tone="ok" />
            <Stat value={summary.failed} label="Falladas" tone="fail" />
            <Stat value={summary.inProgress} label="En curso" tone="progress" />
            <Stat
              value={summary.successRate === null ? '—' : `${summary.successRate}%`}
              label="Éxito"
              tone="gold"
            />
          </div>
        </div>
      </div>

      <div className={styles.activity}>
        <div className={styles.activityHead}>
          <span className={styles.cardLabel}>Actividad (últimos {ACTIVITY_DAYS} días)</span>
          <span className={styles.legend}>
            <span className={`${styles.legendDot} ${styles.dotOk}`} /> completadas
            <span className={`${styles.legendDot} ${styles.dotFail}`} /> falladas
          </span>
        </div>
        <div className={styles.bars}>
          {activity.map((d) => {
            const total = d.ok + d.fail
            return (
              <div key={d.key} className={styles.barCol} title={`${d.label}: ${d.ok} ok · ${d.fail} fall`}>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barStack}
                    style={{ height: `${(total / maxDay) * 100}%` }}
                  >
                    {d.fail > 0 ? (
                      <div
                        className={styles.barFail}
                        style={{ flexGrow: d.fail }}
                        aria-hidden
                      />
                    ) : null}
                    {d.ok > 0 ? (
                      <div className={styles.barOk} style={{ flexGrow: d.ok }} aria-hidden />
                    ) : null}
                  </div>
                </div>
                <span className={styles.barLabel}>{d.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number | string
  label: string
  tone: 'ok' | 'fail' | 'progress' | 'gold'
}) {
  return (
    <div className={styles.stat}>
      <span className={`${styles.statValue} ${styles[tone]}`}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}
