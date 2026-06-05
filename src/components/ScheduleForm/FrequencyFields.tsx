import type { ReactNode } from 'react'
import { assertNever } from '../../domain/assert-never'
import { LAST_DAY, MAX_DAY_OF_MONTH, MIN_DAY_OF_MONTH } from '../../domain/frequency'
import { WEEKDAYS_ES } from '../../domain/labels'
import type { FormState } from './useScheduleForm'
import styles from './ScheduleForm.module.css'

interface FrequencyFieldsProps {
  state: FormState
  patch: (patch: Partial<FormState>) => void
  toggleWeeklyDay: (value: number) => void
}

const MONTH_DAYS = Array.from(
  { length: MAX_DAY_OF_MONTH - MIN_DAY_OF_MONTH + 1 },
  (_, i) => i + MIN_DAY_OF_MONTH,
)

// Campos condicionales según la frecuencia elegida (switch exhaustivo).
export function FrequencyFields({ state, patch, toggleWeeklyDay }: FrequencyFieldsProps) {
  switch (state.kind) {
    case 'daily':
      return (
        <Field label="Horario">
          <input
            type="time"
            value={state.dailyTime}
            onChange={(e) => patch({ dailyTime: e.target.value })}
          />
        </Field>
      )

    case 'hourly':
      return (
        <Field label="Cada cuántas horas">
          <input
            type="number"
            min={1}
            max={24}
            value={state.everyHours}
            onChange={(e) => patch({ everyHours: e.target.valueAsNumber || 0 })}
          />
        </Field>
      )

    case 'weekly':
      return (
        <>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Días de la semana</span>
            <div className={styles.weekdays} role="group" aria-label="Días de la semana">
              {WEEKDAYS_ES.map((d) => {
                const active = state.weeklyDays.includes(d.value)
                return (
                  <button
                    type="button"
                    key={d.value}
                    className={active ? `${styles.day} ${styles.dayActive}` : styles.day}
                    aria-pressed={active}
                    onClick={() => toggleWeeklyDay(d.value)}
                    title={d.long}
                  >
                    {d.short}
                  </button>
                )
              })}
            </div>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  )
}
