import { useState } from 'react'
import { api, ApiError } from '../../api'
import type {
  FrequencyKind,
  RefreshType,
  Schedule,
  ScheduleMutationResult,
} from '../../api/types'
import {
  REFRESH_TYPE_ES,
  REFRESH_TYPE_HINT_ES,
  TIMEZONE_LABEL,
} from '../../domain/labels'
import { Modal } from '../common/Modal'
import { FrequencyFields } from './FrequencyFields'
import { useScheduleForm } from './useScheduleForm'
import styles from './ScheduleModal.module.css'

export type ScheduleModalMode =
  | { type: 'create'; datasetId: string; workspaceId: string; tableNames: string[] }
  | { type: 'edit'; schedule: Schedule }

interface ScheduleModalProps {
  mode: ScheduleModalMode
  /** Solo en create: tablas elegidas que ya tenían schedule y serán reasignadas. */
  reassignTables?: string[]
  onSaved: (result: ScheduleMutationResult) => void
  onClose: () => void
}

const KINDS: Array<{ kind: FrequencyKind; label: string }> = [
  { kind: 'daily', label: 'Diario' },
  { kind: 'hourly', label: 'Cada N horas' },
  { kind: 'weekly', label: 'Semanal' },
  { kind: 'monthly', label: 'Mensual' },
]

const REFRESH_TYPES: RefreshType[] = ['full', 'dataOnly', 'calculate']

export function ScheduleModal({ mode, reassignTables, onSaved, onClose }: ScheduleModalProps) {
  const { state, patch, toggleWeeklyDay, build } = useScheduleForm(
    mode.type === 'edit' ? mode.schedule : undefined,
  )
  const [errors, setErrors] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const targetTables = mode.type === 'create' ? mode.tableNames : mode.schedule.tables
  const title = mode.type === 'create' ? 'Programar tablas' : 'Editar programación'

  async function handleSave() {
    const result = build()
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors([])
    setSubmitError(null)
    setBusy(true)
    try {
      const mutation =
        mode.type === 'create'
          ? await api.createSchedule({
              datasetId: mode.datasetId,
              workspaceId: mode.workspaceId,
              tables: mode.tableNames,
              frequency: result.frequency,
              refreshType: state.refreshType,
              enabled: state.enabled,
            })
          : await api.updateSchedule(mode.schedule.id, {
              frequency: result.frequency,
              refreshType: state.refreshType,
              enabled: state.enabled,
            })
      onSaved(mutation)
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'No se pudo guardar la programación.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (mode.type !== 'edit') return
    setSubmitError(null)
    setBusy(true)
    try {
      const mutation = await api.deleteSchedule(mode.schedule.id)
      onSaved(mutation)
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'No se pudo eliminar la programación.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="schedule-modal-title">
      <div className={styles.header}>
        <h2 id="schedule-modal-title" className={styles.heading}>
          {title}
        </h2>
        <div className={styles.targets}>
          {targetTables.length} {targetTables.length === 1 ? 'tabla' : 'tablas'}:{' '}
          {targetTables.join(', ')}
        </div>
      </div>

      <div className={styles.body}>
        {reassignTables && reassignTables.length > 0 ? (
          <div className={styles.warn}>
            {reassignTables.length === 1
              ? `La tabla ${reassignTables[0]} ya tenía una programación y se moverá a esta (se quita de la anterior).`
              : `Estas tablas ya tenían programación y se moverán a esta (se quitan de la anterior): ${reassignTables.join(', ')}.`}
          </div>
        ) : null}

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Frecuencia</span>
          <div className={styles.segmented} role="group" aria-label="Frecuencia">
            {KINDS.map((k) => (
              <button
                type="button"
                key={k.kind}
                className={
                  state.kind === k.kind ? `${styles.segment} ${styles.segmentActive}` : styles.segment
                }
                aria-pressed={state.kind === k.kind}
                onClick={() => patch({ kind: k.kind })}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <FrequencyFields state={state} patch={patch} toggleWeeklyDay={toggleWeeklyDay} />

        <div className={styles.tz}>
          Zona horaria: <strong>{TIMEZONE_LABEL}</strong>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Tipo de refresh</span>
          <div className={styles.radios}>
            {REFRESH_TYPES.map((rt) => (
              <label key={rt} className={styles.radio}>
                <input
                  type="radio"
                  name="refreshType"
                  checked={state.refreshType === rt}
                  onChange={() => patch({ refreshType: rt })}
                />
                <span>
                  <span className={styles.radioLabel}>{REFRESH_TYPE_ES[rt]}</span>
                  <span className={styles.radioHint}>{REFRESH_TYPE_HINT_ES[rt]}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
          />
          <span>Habilitado</span>
        </label>

        {errors.length > 0 ? (
          <ul className={styles.errors}>
            {errors.map((er, i) => (
              <li key={i}>{er}</li>
            ))}
          </ul>
        ) : null}
        {submitError ? <div className={styles.submitError}>{submitError}</div> : null}
      </div>

      <div className={styles.footer}>
        {mode.type === 'edit' ? (
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={busy}>
            Eliminar
          </button>
        ) : (
          <span />
        )}
        <div className={styles.footerRight}>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
