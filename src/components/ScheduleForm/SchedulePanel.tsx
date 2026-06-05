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
import { FrequencyFields } from './FrequencyFields'
import { useScheduleForm } from './useScheduleForm'
import styles from './ScheduleForm.module.css'

interface SchedulePanelProps {
  /** Si hay schedule, el rail está en modo edición; si no, en modo crear. */
  editing: Schedule | null
  workspaceId: string | null
  datasetId: string | null
  /** Tablas tildadas en la lista (modo crear). */
  checkedTableNames: string[]
  /** Tablas tildadas que ya tenían schedule y serán reasignadas (modo crear). */
  reassignTables: string[]
  onSaved: (result: ScheduleMutationResult) => void
  /** Salir del modo edición y volver a "nueva programación". */
  onCancelEdit: () => void
}

const KINDS: Array<{ kind: FrequencyKind; label: string }> = [
  { kind: 'daily', label: 'Diario' },
  { kind: 'hourly', label: 'Cada N horas' },
  { kind: 'weekly', label: 'Semanal' },
  { kind: 'monthly', label: 'Mensual' },
]

const REFRESH_TYPES: RefreshType[] = ['full', 'dataOnly', 'calculate']

export function SchedulePanel({
  editing,
  workspaceId,
  datasetId,
  checkedTableNames,
  reassignTables,
  onSaved,
  onCancelEdit,
}: SchedulePanelProps) {
  const { state, patch, toggleWeeklyDay, build } = useScheduleForm(editing ?? undefined)
  const [errors, setErrors] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isEdit = editing !== null
  const targetTables = isEdit ? editing.tables : checkedTableNames
  const canCreate = targetTables.length > 0 && !!workspaceId && !!datasetId

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
        editing === null
          ? await api.createSchedule({
              datasetId: datasetId!,
              workspaceId: workspaceId!,
              tables: checkedTableNames,
              frequency: result.frequency,
              refreshType: state.refreshType,
              enabled: state.enabled,
            })
          : await api.updateSchedule(editing.id, {
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
    if (editing === null) return
    setSubmitError(null)
    setBusy(true)
    try {
      const mutation = await api.deleteSchedule(editing.id)
      onSaved(mutation)
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'No se pudo eliminar la programación.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={styles.rail} aria-label="Programación">
      <div className={styles.railHeader}>
        <h2 className={styles.heading}>{isEdit ? 'Editar programación' : 'Nueva programación'}</h2>
        {isEdit ? (
          <button type="button" className={styles.newLink} onClick={onCancelEdit} disabled={busy}>
            + Nueva
          </button>
        ) : null}
      </div>

      <div className={styles.targets}>
        {targetTables.length === 0 ? (
          'Tildá una o más tablas en la lista para programarlas.'
        ) : (
          <>
            <span className={styles.targetsStrong}>
              {targetTables.length} {targetTables.length === 1 ? 'tabla' : 'tablas'}
            </span>
            : {targetTables.join(', ')}
          </>
        )}
      </div>

      <div className={styles.body}>
        {!isEdit && reassignTables.length > 0 ? (
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
        {isEdit ? (
          <>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={busy}>
              Eliminar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={busy}
            >
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`btn btn-primary ${styles.grow}`}
            onClick={handleSave}
            disabled={busy || !canCreate}
            title={canCreate ? undefined : 'Tildá al menos una tabla'}
          >
            {busy
              ? 'Programando…'
              : `Programar${targetTables.length > 0 ? ` ${targetTables.length}` : ''}`}
          </button>
        )}
      </div>
    </section>
  )
}
