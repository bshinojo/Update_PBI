import type { Schedule } from '../../api/types'
import { formatFrequency } from '../../domain/frequency'
import { formatNextRun } from '../../domain/time'
import styles from './UpcomingRuns.module.css'

const MAX_ITEMS = 3

// "Próximas ejecuciones" del modelo, en el sidebar: responde de un vistazo LA
// pregunta de un programador de tareas ("¿cuándo corre?"). Usa el nextRunAt que
// deriva el backend; los pausados no aparecen (no van a correr).
export function UpcomingRuns({ schedules }: { schedules: Schedule[] }) {
  const upcoming = schedules
    .filter((s) => s.enabled && s.nextRunAt)
    .map((s) => ({ schedule: s, when: formatNextRun(s.nextRunAt!) }))
    .filter((x) => x.when !== '')
    .sort((a, b) => a.schedule.nextRunAt!.localeCompare(b.schedule.nextRunAt!))
    .slice(0, MAX_ITEMS)

  if (upcoming.length === 0) return null

  return (
    <div className={styles.wrap}>
      <span className={styles.title}>Próximas ejecuciones</span>
      <ol className={styles.list}>
        {upcoming.map(({ schedule, when }) => (
          <li key={schedule.id} className={styles.item}>
            <span className={styles.when}>{when}</span>
            <span className={styles.what}>
              {formatFrequency(schedule.frequency)} · {schedule.tables.length}{' '}
              {schedule.tables.length === 1 ? 'tabla' : 'tablas'}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
