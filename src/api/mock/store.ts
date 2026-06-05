// Store en memoria del mock, persistido en localStorage. Todas las escrituras
// pasan por acá y mantienen el invariante: cada schedule tiene >= 1 tabla, y
// TableInfo.scheduleId apunta siempre al schedule correcto (con reasignación).
// Las lecturas devuelven structuredClone, así nadie muta el store por referencia
// (imita el límite de una red real).
import type {
  CreateScheduleInput,
  Dataset,
  Schedule,
  ScheduleMutationResult,
  TableInfo,
  UpdateScheduleInput,
  Workspace,
} from '../types'
import { scheduleTime } from '../../domain/frequency'
import { ApiError } from '../client'
import { createSeedDb } from './seed'

export interface MockDb {
  workspaces: Workspace[]
  datasets: Dataset[]
  tables: TableInfo[]
  schedules: Schedule[]
}

const STORAGE_KEY = 'pbi-refresh-mock-v1'

const clone = <T>(value: T): T => structuredClone(value)

function persistDb(d: MockDb): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
  } catch {
    // Sin acceso a localStorage (modo privado, etc.): seguimos solo en memoria.
  }
}

function isMockDb(value: unknown): value is MockDb {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.workspaces) &&
    Array.isArray(v.datasets) &&
    Array.isArray(v.tables) &&
    Array.isArray(v.schedules)
  )
}

function loadDb(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (isMockDb(parsed)) return parsed
      // JSON válido pero con forma inesperada (versión vieja del esquema, edición
      // manual): descartamos y re-sembramos en vez de crashear en la primera lectura.
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // JSON corrupto o storage inaccesible -> re-sembramos.
  }
  const seeded = createSeedDb()
  persistDb(seeded)
  return seeded
}

let db: MockDb = loadDb()

function persist(): void {
  persistDb(db)
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

function setTableSchedule(datasetId: string, name: string, scheduleId: string | undefined): void {
  const t = db.tables.find((tb) => tb.datasetId === datasetId && tb.name === name)
  if (t) t.scheduleId = scheduleId
}

/**
 * Quita las tablas indicadas de cualquier OTRO schedule del mismo dataset.
 * Si un schedule queda sin tablas, se elimina. El scheduleId de las tablas
 * desprendidas lo re-asigna el llamador.
 */
function detachTablesFromOthers(datasetId: string, tableNames: string[], exceptId: string): void {
  const names = new Set(tableNames)
  for (const sch of [...db.schedules]) {
    if (sch.datasetId !== datasetId || sch.id === exceptId) continue
    const kept = sch.tables.filter((n) => !names.has(n))
    if (kept.length === sch.tables.length) continue
    sch.tables = kept
    if (kept.length === 0) {
      db.schedules = db.schedules.filter((s) => s.id !== sch.id)
    }
  }
}

function buildResult(datasetId: string, affected: Schedule | null): ScheduleMutationResult {
  return {
    affected: affected ? clone(affected) : null,
    tables: clone(db.tables.filter((t) => t.datasetId === datasetId)),
  }
}

// --- Lecturas (devuelven copias) ---

export function getWorkspaces(): Workspace[] {
  return clone(db.workspaces)
}
export function getDatasets(workspaceId: string): Dataset[] {
  return clone(db.datasets.filter((d) => d.workspaceId === workspaceId))
}
export function getTables(datasetId: string): TableInfo[] {
  return clone(db.tables.filter((t) => t.datasetId === datasetId))
}
export function getSchedules(datasetId: string): Schedule[] {
  return clone(db.schedules.filter((s) => s.datasetId === datasetId))
}

// --- Escrituras ---

export function createSchedule(input: CreateScheduleInput): ScheduleMutationResult {
  const id = genId('sch')
  detachTablesFromOthers(input.datasetId, input.tables, id)
  const schedule: Schedule = {
    ...input,
    id,
    tables: [...input.tables],
    time: scheduleTime(input.frequency),
  }
  db.schedules.push(schedule)
  for (const name of input.tables) setTableSchedule(input.datasetId, name, id)
  persist()
  return buildResult(input.datasetId, schedule)
}

export function updateSchedule(id: string, patch: UpdateScheduleInput): ScheduleMutationResult {
  const sch = db.schedules.find((s) => s.id === id)
  if (!sch) throw new ApiError('El schedule no existe.', 404)

  if (patch.tables) {
    detachTablesFromOthers(sch.datasetId, patch.tables, id)
    const next = new Set(patch.tables)
    // Tablas que dejan este schedule quedan sin programar.
    for (const name of sch.tables) {
      if (!next.has(name)) setTableSchedule(sch.datasetId, name, undefined)
    }
    sch.tables = [...patch.tables]
    for (const name of patch.tables) setTableSchedule(sch.datasetId, name, id)
  }
  if (patch.frequency) {
    sch.frequency = patch.frequency
    sch.time = scheduleTime(patch.frequency)
  }
  if (patch.refreshType !== undefined) sch.refreshType = patch.refreshType
  if (patch.enabled !== undefined) sch.enabled = patch.enabled

  persist()
  return buildResult(sch.datasetId, sch)
}

export function setScheduleEnabled(id: string, enabled: boolean): ScheduleMutationResult {
  const sch = db.schedules.find((s) => s.id === id)
  if (!sch) throw new ApiError('El schedule no existe.', 404)
  sch.enabled = enabled
  persist()
  return buildResult(sch.datasetId, sch)
}

export function deleteSchedule(id: string): ScheduleMutationResult {
  const sch = db.schedules.find((s) => s.id === id)
  if (!sch) throw new ApiError('El schedule no existe.', 404)
  const datasetId = sch.datasetId
  for (const name of sch.tables) setTableSchedule(datasetId, name, undefined)
  db.schedules = db.schedules.filter((s) => s.id !== id)
  persist()
  return buildResult(datasetId, null)
}

/** Restaura los datos sembrados (botón "Resetear demo"). */
export function reset(): void {
  db = createSeedDb()
  persist()
}
