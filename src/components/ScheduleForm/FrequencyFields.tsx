import type { ReactNode } from 'react'
import { assertNever } from '../../domain/assert-never'
import {
  HOURLY_INTERVALS,
  LAST_DAY,
  MAX_DAY_OF_MONTH,
  MIN_DAY_OF_MONTH,
  formatHour,
} from '../../domain/frequency'
import { WEEKDAYS_ES } from '../../domain/labels'
import type { FormState } from './useScheduleForm'
import styles from './ScheduleForm.module.css'

interface FrequencyFieldsProps {
  state: FormState
  patch: (patch: Partial<FormState>) => void
  toggleDailyDay: (value: number) => void
  toggleHourlyDay: (value: number) => void
}

const MONTH_DAYS = Array.from(
  { length: MAX_DAY_OF_MONTH - MIN_DAY_OF_MONTH + 1 },
  (_, i) => i + MIN_DAY_OF_MONTH,
)
const HOURS = Array.from({ length: 24 }, (_, h) => h)

// Campos condicionales según la frecuencia elegida (switch exhaustivo).
export function FrequencyFields({
  state,
  patch,
  toggleDailyDay,
  toggleHourlyDay,
}: FrequencyFieldsProps) {
  switch (state.kind) {
    case 'daily':
      return (
        <>
          <Field label="Horario">
            <input
              type="time"
              value={state.dailyTime}
              onChange={(e) => patch({ dailyTime: e.target.value })}
            />
          </Field>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Días de la semana</span>
            <WeekdayChips selected={state.dailyDays} onToggle={toggleDailyDay} />
          </div>
        </>
      )

    case 'hourly':
      return (
        <>
          <Field label="Cada cuánto">
            <select
              value={state.hourlyEvery}
              onChange={(e) => patch({ hourlyEvery: Number(e.target.value) })}
            >
              {HOURLY_INTERVALS.map((o) => (
                <option key={o.minutes} value={o.minutes}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Franja horaria</span>
            <div className={styles.rangeRow}>
              <select
                aria-label="Desde"
                value={state.hourlyStart}
                onChange={(e) => patch({ hourlyStart: Number(e.target.value) })}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
              <span className={styles.rangeSep}>a</span>
              <select
                aria-label="Hasta"
                value={state.hourlyEnd}
                onChange={(e) => patch({ hourlyEnd: Number(e.target.value) })}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </div>
            <span className={styles.fieldHint}>Dejá 00:00 a 23:00 para que corra todo el día.</span>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Días de la semana</span>
            <WeekdayChips selected={state.hourlyDays} onToggle={toggleHourlyDay} />
          </div>
        </>
      )

    case 'weekly':
      return (
        <>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Día de la semana</span>
            <WeekdayChips
              selected={[state.weeklyDay]}
              single
              onToggle={(value) => patch({ weeklyDay: value })}
            />
            <span className={styles.fieldHint}>Una vez por semana, en el día elegido.</span>
          </div>
          <Field label="Horario">
            <input
              type="time"
              value={state.weeklyTime}
              onChange={(e) => patch({ weeklyTime: e.target.value })}
            />
          </Field>
        </>
      )

    case 'monthly':
      return (
        <>
          <Field label="Día del mes">
            <select
              value={state.monthlyDay === LAST_DAY ? 'last' : String(state.monthlyDay)}
              onChange={(e) =>
                patch({
                  monthlyDay: e.target.value === 'last' ? LAST_DAY : Number(e.target.value),
                })
              }
            >
              {MONTH_DAYS.map((d) => (
                <option key={d} value={d}>
                  Día {d}
                </option>
              ))}
              <option value="last">Último día del mes</option>
            </select>
          </Field>
          <Field label="Horario">
            <input
              type="time"
              value={state.monthlyTime}
              onChange={(e) => patch({ monthlyTime: e.target.value })}
            />
          </Field>
        </>
      )

    default:
      return assertNever(state.kind)
  }
}

// Selector de días reutilizable. `single` = elección única (radio); si no, multi.
function WeekdayChips({
  selected,
  onToggle,
  single = false,
}: {
  selected: number[]
  onToggle: (value: number) => void
  single?: boolean
}) {
  return (
    <div
      className={styles.weekdays}
      role={single ? 'radiogroup' : 'group'}
      aria-label="Días de la semana"
    >
      {WEEKDAYS_ES.map((d) => {
        const active = selected.includes(d.value)
        return (
          <button
            type="button"
            key={d.value}
            className={active ? `${styles.day} ${styles.dayActive}` : styles.day}
            role={single ? 'radio' : undefined}
            aria-pressed={single ? undefined : active}
            aria-checked={single ? active : undefined}
            onClick={() => onToggle(d.value)}
            title={d.long}
          >
            {d.short}
          </button>
        )
      })}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  )
}
