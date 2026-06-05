// Tipos de dominio compartidos por la capa mock, el (futuro) cliente HTTP,
// los hooks y los componentes. Es el ÚNICO contrato: NO importa nada de React.
// Cuando llegue el backend real (FastAPI) debe implementar estas mismas formas.

export type RefreshType = 'full' | 'dataOnly' | 'calculate'
export type RunStatus = 'Completed' | 'Failed' | 'InProgress'

export interface Workspace {
  id: string
  name: string
}

export interface Dataset {
  id: string
  name: string
  workspaceId: string
}

export interface TableInfo {
  name: string
  datasetId: string
  /** Id del schedule al que pertenece esta tabla, si tiene uno. */
  scheduleId?: string
}

export interface LastRun {
  status: RunStatus
  /** Marca de tiempo ISO 8601. */
  timestamp: string
}

// --- Frecuencia: unión discriminada por `kind` ---

export interface DailyFrequency {
  kind: 'daily'
  /** "HH:mm" */
  time: string
}
export interface HourlyFrequency {
  kind: 'hourly'
  everyHours: number
}
export interface WeeklyFrequency {
  kind: 'weekly'
  /** Números de día JS: 0=Domingo .. 6=Sábado (la UI los muestra empezando por Lunes). */
  daysOfWeek: number[]
  /** "HH:mm" */
  time: string
}
export interface MonthlyFrequency {
  kind: 'monthly'
  /** 1..28, o LAST_DAY (-1) para "último día del mes" (ver domain/frequency.ts). */
  dayOfMonth: number
  /** "HH:mm" */
  time: string
}
export type Frequency =
  | DailyFrequency
  | HourlyFrequency
  | WeeklyFrequency
  | MonthlyFrequency
export type FrequencyKind = Frequency['kind']

export interface Schedule {
  id: string
  datasetId: string
  workspaceId: string
  tables: string[]
  frequency: Frequency
  /**
   * Espejo denormalizado de `frequency.time`, derivado por el API con
   * scheduleTime() ("" para 'hourly'). Nunca lo manda el cliente.
   */
  time: string
  refreshType: RefreshType
  enabled: boolean
  lastRun?: LastRun
}

// --- Inputs de mutación ---
// El cliente no puede inventar campos que el backend rechazaría.
// `time` se omite a propósito: lo deriva el API a partir de `frequency`.

export type CreateScheduleInput = Omit<Schedule, 'id' | 'lastRun' | 'time'>
export type UpdateScheduleInput = Partial<
  Omit<Schedule, 'id' | 'datasetId' | 'workspaceId' | 'time'>
>

/**
 * Resultado de cualquier mutación de schedule.
 * Devuelve las entidades afectadas para que la UI se actualice con la RESPUESTA
 * (y no con un refetch que asume que el backend ya escribió). Esto hace que el
 * patrón sobreviva al swap a un backend real con latencia / consistencia eventual.
 */
export interface ScheduleMutationResult {
  /** El schedule creado o actualizado; `null` si fue eliminado. */
  affected: Schedule | null
  /**
   * Lista COMPLETA y actualizada de tablas del dataset, con `scheduleId`
   * sincronizado (incluye reasignaciones en cascada). La UI reconstruye su
   * lista de schedules a partir de los `scheduleId` referenciados aquí.
   */
  tables: TableInfo[]
}
