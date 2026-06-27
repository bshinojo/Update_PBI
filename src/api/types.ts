// Tipos de dominio compartidos por la capa de API (HTTP), los hooks y los
// componentes. Es el ÚNICO contrato: NO importa nada de React. El backend FastAPI
// devuelve estas mismas formas (camelCase) para no mapear nada acá.

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
  /** Motivo del fallo (texto corto), solo cuando status es 'Failed'. */
  error?: string
}

// --- Frecuencia: unión discriminada por `kind` ---

export interface DailyFrequency {
  kind: 'daily'
  /** "HH:mm" */
  time: string
  /**
   * Días JS en los que corre (0=Domingo..6=Sábado, mostrados Lunes-primero).
   * Ausente o lista vacía = todos los días.
   */
  daysOfWeek?: number[]
}
export interface HourlyFrequency {
  kind: 'hourly'
  /** Intervalo en horas enteras. Compat con schedules viejos. */
  everyHours?: number
  /** Intervalo en minutos (sub-hora: 15/20/30). Tiene prioridad sobre everyHours. */
  everyMinutes?: number
  /** Inicio de la franja horaria (0..23). Ausente = desde la medianoche (00). */
  startHour?: number
  /** Fin de la franja horaria, inclusive (0..23). Ausente = hasta las 23. */
  endHour?: number
  /**
   * Días JS en los que corre (0=Domingo..6=Sábado, mostrados Lunes-primero).
   * Ausente o lista vacía = todos los días.
   */
  daysOfWeek?: number[]
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
  /**
   * Próxima corrida (ISO, en ART), DERIVADA por el backend en cada respuesta.
   * Ausente si el schedule está pausado. Nunca la manda el cliente.
   */
  nextRunAt?: string
}

/** Una corrida TERMINADA del historial (GET /schedules/{id}/runs). */
export interface RunRecord {
  scheduleId: string
  datasetId: string
  workspaceId: string
  tables: string[]
  refreshType: string
  refreshId?: string
  status: RunStatus
  /** ISO 8601. */
  startedAt: string
  /** ISO 8601. */
  finishedAt: string
  /** Motivo del fallo, si status es 'Failed' y se conoce. */
  error?: string
}

/**
 * Una fila del informe global (GET /report): una actualización terminada (del
 * historial) o una EN CURSO (del scheduler). Como las en curso no terminaron,
 * `finishedAt` es opcional; y trae los nombres legibles de workspace/modelo
 * (resueltos en el backend, ausentes si no se pudieron leer).
 */
export interface ReportRun {
  scheduleId: string
  datasetId: string
  workspaceId: string
  workspaceName?: string
  datasetName?: string
  tables: string[]
  refreshType: string
  refreshId?: string
  status: RunStatus
  /** ISO 8601. */
  startedAt: string
  /** ISO 8601; ausente mientras está En curso. */
  finishedAt?: string
  error?: string
}

/** Contadores de programaciones para el resumen del informe. */
export interface ScheduleCounts {
  total: number
  /** Habilitadas (las dispara el scheduler). */
  active: number
  /** Deshabilitadas (pausadas). */
  paused: number
}

/** Respuesta de GET /report: lo que necesita la vista --INFORME--. */
export interface Report {
  schedules: ScheduleCounts
  /** Últimas actualizaciones: las En curso primero, luego el historial. */
  runs: ReportRun[]
}

/** Estado del backend + su scheduler (GET /health). */
export interface HealthStatus {
  status: string
  scheduler: {
    running: boolean
    lastTickAt: string | null
    healthy: boolean
  }
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
