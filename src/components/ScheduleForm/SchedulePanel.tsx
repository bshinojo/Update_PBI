import { useEffect, useState } from 'react'
import { api, ApiError } from '../../api'
import type {
  FrequencyKind,
  Schedule,
  ScheduleMutationResult,
} from '../../api/types'
import {
  REFRESH_TYPE_ES,
  REFRESH_TYPE_HINT_ES,
  RUN_STATUS_ES,
  TIMEZONE_LABEL,
} from '../../domain/labels'
import { formatFrequency } from '../../domain/frequency'
import { formatNextRun, formatRelativeTime, formatRunDuration } from '../../domain/time'
import { useRuns } from '../../hooks/useRuns'
import { ColumnHeader } from '../common/ColumnHeader'
import { Icon } from '../common/Icon'
import { FrequencyFields } from './FrequencyFields'
import { useScheduleForm } from './useScheduleForm'
import styles from './ScheduleForm.module.css'

interface SchedulePanelProps {
  /** Si hay schedule, el rail está en modo edición; si no, en modo crear. */
  editing: Schedule | null
  /** Membresía EDITABLE de la programación (modo edición; vive en App). */
  editTables: string[]
  workspaceId: string | null
  datasetId: string | null
  /** Tablas tildadas en la lista (modo crear). */
  checkedTableNames: string[]
  /** Tablas del objetivo que pertenecen a OTRA programación y se moverían. */
  reassignments: Array<{ table: string; from: string }>
  /** Mensaje de éxito de la última mutación (vive en App: sobrevive al remount). */
  flash: string | null
  onSaved: (result: ScheduleMutationResult) => void
  /** Acciones que NO salen del modo edición (Ejecutar ahora / pausar al toque). */
  onRan: (result: ScheduleMutationResult) => void
  /** Salir del modo edición y volver a "nueva programación". */
  onCancelEdit: () => void
}

const KINDS: Array<{ kind: FrequencyKind; label: string }> = [
  { kind: 'daily', label: 'Diario' },
  { kind: 'hourly', label: 'Cada N horas' },
  { kind: 'weekly', label: 'Semanal' },
  { kind: 'monthly', label: 'Mensual' },
]

export function SchedulePanel({
  editing,
  editTables,
  workspaceId,
  datasetId,
  checkedTableNames,
  reassignments,
  flash,
  onSaved,
  onRan,
  onCancelEdit,
}: SchedulePanelProps) {
  const { state, patch, toggleDailyDay, toggleHourlyDay, build } = useScheduleForm(
    editing ?? undefined,
  )
  const [errors, setErrors] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Eliminar pide confirmación: el primer click "arma" el botón, el segundo borra.
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [running, setRunning] = useState(false)
  const [runMessage, setRunMessage] = useState<string | null>(null)
  // El switch "Habilitado" en edición aplica AL INSTANTE (PUT /enabled).
  const [togglingEnabled, setTogglingEnabled] = useState(false)

  const isEdit = editing !== null
  const targetTables = isEdit ? editTables : checkedTableNames
  const canSubmit = targetTables.length > 0 && !!workspaceId && !!datasetId

  // Vista previa en vivo de la programación (solo si el form es válido).
  const built = build()
  const previewText = built.ok ? formatFrequency(built.frequency) : null

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
              refreshType: 'full',
              enabled: state.enabled,
            })
          : await api.updateSchedule(editing.id, {
              tables: editTables,
              frequency: result.frequency,
              refreshType: 'full',
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
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSubmitError(null)
    setBusy(true)
    try {
      const mutation = await api.deleteSchedule(editing.id)
      onSaved(mutation)
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'No se pudo eliminar la programación.')
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  async function handleRunNow() {
    if (editing === null) return
    setRunMessage(null)
    setSubmitError(null)
    setRunning(true)
    try {
      const mutation = await api.runScheduleNow(editing.id)
      onRan(mutation)
      setRunMessage('Actualización disparada: mirá el estado en "Última actualización".')
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'No se pudo disparar la actualización.')
    } finally {
      setRunning(false)
    }
  }

  // En EDICIÓN, el switch pausa/reanuda al instante (endpoint dedicado, sin pasar
  // por Guardar): pausar es la operación más frecuente y no debería costar 3 clicks.
  // En ALTA solo define el estado inicial (se manda en el POST).
  async function handleToggleEnabled(next: boolean) {
    patch({ enabled: next })
    if (editing === null) return
    setSubmitError(null)
    setTogglingEnabled(true)
    try {
      const mutation = await api.setScheduleEnabled(editing.id, next)
      onRan(mutation)
    } catch (e) {
      patch({ enabled: !next }) // revertir: el servidor no lo aplicó
      setSubmitError(e instanceof ApiError ? e.message : 'No se pudo cambiar el estado.')
    } finally {
      setTogglingEnabled(false)
    }
  }

  const nextRunText =
    isEdit && editing.nextRunAt ? formatNextRun(editing.nextRunAt) : ''

  return (
    <section className={styles.rail} aria-label="Programación">
      <ColumnHeader
        eyebrow="Programación"
        title={isEdit ? 'Editar programación' : 'Nueva programación'}
        actions={
          isEdit ? (
            <>
              <button
                type="button"
                className={styles.newLink}
                onClick={onCancelEdit}
                disabled={busy}
              >
                + Nueva
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                onBlur={() => setConfirmDelete(false)}
                disabled={busy || running}
              >
                {confirmDelete ? '¿Seguro? Eliminar' : 'Eliminar'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={busy || editTables.length === 0}
                title={
                  editTables.length === 0
                    ? 'La programación necesita al menos una tabla'
                    : undefined
                }
              >
                {busy ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`btn btn-primary ${styles.cta}`}
              onClick={handleSave}
              disabled={busy || !canSubmit}
              title={canSubmit ? undefined : 'Seleccioná al menos una tabla'}
            >
              {busy
                ? 'Programando…'
                : `Programar${targetTables.length > 0 ? ` ${targetTables.length}` : ''}`}
            </button>
          )
        }
      />

      <div className={styles.body}>
        {/* Errores ARRIBA, pegados al header donde vive el CTA: si el rail es largo,
            un error al fondo puede quedar fuera de vista al clickear Programar. */}
        {errors.length > 0 ? (
          <ul className={styles.errors}>
            {errors.map((er, i) => (
              <li key={i}>{er}</li>
            ))}
          </ul>
        ) : null}
        {submitError ? <div className={styles.submitError}>{submitError}</div> : null}
        {flash ? <div className={styles.flash}>{flash}</div> : null}

        {targetTables.length === 0 ? (
          <p className={styles.emptyHint}>
            {isEdit
              ? 'La programación quedó sin tablas: agregá al menos una tocando las filas de la izquierda (o eliminala).'
              : 'Seleccioná una o más tablas de la izquierda (tocá la fila) para programarlas.'}
          </p>
        ) : (
          <div className={styles.targets}>
            <span className={styles.targetsLabel}>
              {isEdit ? 'Editando' : 'Tablas seleccionadas'}
            </span>
            <span className={styles.targetsText}>
              <strong>{targetTables.length}</strong>{' '}
              {targetTables.length === 1 ? 'tabla' : 'tablas'} · {targetTables.join(', ')}
            </span>
            {isEdit ? (
              <span className={styles.targetsHint}>
                Tocá las filas de la izquierda para agregar o quitar tablas; se aplica
                al guardar.
              </span>
            ) : null}
            {isEdit ? (
              <span className={styles.nextRun}>
                Próxima ejecución:{' '}
                <strong>
                  {editing.enabled
                    ? nextRunText || '—'
                    : 'en pausa (no se ejecuta)'}
                </strong>
              </span>
            ) : null}
          </div>
        )}

        {reassignments.length > 0 ? (
          <div className={styles.warn}>
            {reassignments.length === 1
              ? `La tabla ${reassignments[0].table} hoy pertenece a la programación “${reassignments[0].from}” y se moverá a esta.`
              : `Estas tablas hoy pertenecen a otra programación y se moverán a esta: ${reassignments
                  .map((r) => `${r.table} (${r.from})`)
                  .join(', ')}.`}{' '}
            Si la programación de origen queda sin tablas, se elimina.
          </div>
        ) : null}

        {isEdit ? (
          <div className={styles.runRow}>
            <button
              type="button"
              className="btn"
              onClick={handleRunNow}
              disabled={busy || running}
            >
              {running ? 'Disparando…' : '▶ Ejecutar ahora'}
            </button>
            <span className={styles.fieldHint}>
              Dispara la actualización ya mismo, además de la programación.
            </span>
            {runMessage ? <span className={styles.runOk}>{runMessage}</span> : null}
          </div>
        ) : null}

        {/* Historial ARRIBA del formulario: quien entra a editar tras un fallo
            busca el "por qué" antes que los campos de frecuencia. */}
        {isEdit ? <RunHistory schedule={editing} /> : null}

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

        <FrequencyFields
          state={state}
          patch={patch}
          toggleDailyDay={toggleDailyDay}
          toggleHourlyDay={toggleHourlyDay}
        />

        <div className={styles.tz}>
          Zona horaria: <strong>{TIMEZONE_LABEL}</strong>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Tipo de actualización</span>
          <p className={styles.fieldHint}>
            <strong>{REFRESH_TYPE_ES.full}</strong> — {REFRESH_TYPE_HINT_ES.full}
          </p>
        </div>

        <label className={styles.toggleRow}>
          <span className={styles.toggleText}>
            <span className={styles.toggleTitle}>Habilitado</span>
            <span className={styles.toggleHint}>
              {isEdit
                ? 'Pausa o reanuda al instante (sin Guardar). En pausa se conserva todo, pero no corre.'
                : 'Si lo desactivás, la programación se guarda pero no se ejecuta.'}
            </span>
          </span>
          <input
            type="checkbox"
            className={styles.switch}
            role="switch"
            checked={state.enabled}
            disabled={togglingEnabled}
            onChange={(e) => void handleToggleEnabled(e.target.checked)}
          />
        </label>
      </div>

      {/* Resumen SIEMPRE visible (footer del rail): en notebooks, el resumen al
          fondo del scroll quedaba bajo el fold justo en las frecuencias largas. */}
      <footer className={styles.summaryBar}>
        {previewText ? (
          <>
            <span className={styles.summaryText}>
              {previewText} · {REFRESH_TYPE_ES.full}
              {targetTables.length > 0
                ? ` · ${targetTables.length} ${targetTables.length === 1 ? 'tabla' : 'tablas'}`
                : ''}
            </span>
            <span className={styles.summaryMeta}>
              {TIMEZONE_LABEL} · {state.enabled ? 'Habilitada' : 'En pausa'}
            </span>
          </>
        ) : (
          <span className={styles.summaryMeta}>
            Completá la frecuencia para ver el resumen.
          </span>
        )}
      </footer>
    </section>
  )
}

/** Historial de corridas del schedule en edición (últimas 5, la más nueva primero).
 * Colapsable: arranca cerrado para no empujar el formulario hacia abajo, y se abre
 * solo cuando la última corrida FALLÓ (ahí el "por qué" es lo que se viene a buscar). */
function RunHistory({ schedule }: { schedule: Schedule }) {
  // El timestamp del lastRun cambia cuando una corrida termina o arranca: con eso
  // como key de refresco, el historial se actualiza solo (vía el polling de 30s).
  const state = useRuns(schedule.id, schedule.lastRun?.timestamp)
  const lastFailed = schedule.lastRun?.status === 'Failed'
  const [open, setOpen] = useState(lastFailed)
  useEffect(() => {
    // Si una corrida pasa a Failed mientras el rail está abierto, el bloque se
    // despliega solo. El usuario puede volver a cerrarlo (el effect solo corre
    // cuando lastFailed CAMBIA, no en cada render).
    if (lastFailed) setOpen(true)
  }, [lastFailed])

  const count = state.status === 'success' ? state.runs.length : null

  return (
    <div className={styles.history}>
      <button
        type="button"
        className={styles.historyToggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
        Últimas actualizaciones
        {count !== null && count > 0 ? ` (${count})` : ''}
      </button>
      {open ? (
        state.status === 'loading' ? (
          <span className={styles.historyEmpty}>Cargando…</span>
        ) : state.status === 'error' ? (
          <span className={styles.historyEmpty}>No se pudo cargar el historial.</span>
        ) : state.runs.length === 0 ? (
          <span className={styles.historyEmpty}>
            Sin actualizaciones todavía: corre a su hora, o probá "Ejecutar ahora".
          </span>
        ) : (
          <ul className={styles.historyList}>
            {state.runs.map((r) => {
              const duration = formatRunDuration(r.startedAt, r.finishedAt)
              return (
                <li key={`${r.startedAt}-${r.finishedAt}`} className={styles.historyItem}>
                  <Icon
                    name={r.status === 'Completed' ? 'check' : r.status === 'Failed' ? 'x' : 'spinner'}
                    size={13}
                    className={r.status === 'Completed' ? styles.histOk : styles.histFail}
                    title={RUN_STATUS_ES[r.status]}
                  />
                  <span className={styles.historyWhen}>
                    {formatRelativeTime(r.startedAt)}
                    {duration ? ` · duró ${duration}` : ''}
                  </span>
                  {r.status === 'Failed' && r.error ? (
                    <span className={styles.historyError} title={r.error}>
                      {r.error}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )
      ) : null}
    </div>
  )
}
