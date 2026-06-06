// Datos inventados iniciales: 3 workspaces, 2-4 modelos por workspace,
// 4-8 tablas por modelo, y algunos schedules preexistentes con distintos
// estados de último run (Completado / Falló / En curso).
import type { Schedule, TableInfo } from '../types'
import { LAST_DAY, scheduleTime } from '../../domain/frequency'
import type { MockDb } from './store'

/** Completa Schedule.time a partir de la frecuencia (espejo denormalizado). */
function sched(s: Omit<Schedule, 'time'>): Schedule {
  return { ...s, time: scheduleTime(s.frequency) }
}

export function createSeedDb(): MockDb {
  const workspaces = [
    { id: 'ws-ventas', name: 'Ventas y Comercial' },
    { id: 'ws-finanzas', name: 'Finanzas' },
    { id: 'ws-ops', name: 'Operaciones' },
  ]

  const datasetDefs: Array<{
    id: string
    name: string
    workspaceId: string
    tables: string[]
  }> = [
    { id: 'ds-ventas-retail', name: 'Ventas Retail', workspaceId: 'ws-ventas', tables: ['Ventas', 'Clientes', 'Productos', 'Sucursales', 'Vendedores', 'Promociones'] },
    { id: 'ds-ventas-may', name: 'Ventas Mayorista', workspaceId: 'ws-ventas', tables: ['Pedidos', 'Cuentas', 'Productos', 'Descuentos'] },
    { id: 'ds-pipeline', name: 'Pipeline Comercial', workspaceId: 'ws-ventas', tables: ['Oportunidades', 'Etapas', 'Contactos', 'Actividades', 'Forecast'] },
    { id: 'ds-pyl', name: 'P&L Consolidado', workspaceId: 'ws-finanzas', tables: ['Asientos', 'CentrosDeCosto', 'Cuentas', 'Periodos', 'Presupuesto'] },
    { id: 'ds-tesoreria', name: 'Tesorería', workspaceId: 'ws-finanzas', tables: ['FlujoCaja', 'Bancos', 'Conciliaciones', 'Pagos'] },
    { id: 'ds-logistica', name: 'Logística', workspaceId: 'ws-ops', tables: ['Envios', 'Rutas', 'Transportistas', 'Entregas', 'Costos', 'Zonas', 'Devoluciones'] },
    { id: 'ds-inventario', name: 'Inventario', workspaceId: 'ws-ops', tables: ['Stock', 'Movimientos', 'Depositos', 'Lotes', 'Ajustes'] },
    { id: 'ds-rrhh', name: 'RRHH', workspaceId: 'ws-ops', tables: ['Empleados', 'Liquidaciones', 'Ausencias', 'Capacitaciones', 'Legajos', 'Evaluaciones'] },
    { id: 'ds-calidad', name: 'Calidad', workspaceId: 'ws-ops', tables: ['Inspecciones', 'Defectos', 'Auditorias', 'NoConformidades'] },
  ]

  const datasets = datasetDefs.map(({ id, name, workspaceId }) => ({ id, name, workspaceId }))
  const tables: TableInfo[] = datasetDefs.flatMap((d) =>
    d.tables.map((name) => ({ name, datasetId: d.id })),
  )

  const schedules: Schedule[] = [
    sched({ id: 'sch-1', datasetId: 'ds-ventas-retail', workspaceId: 'ws-ventas', tables: ['Ventas', 'Clientes'], frequency: { kind: 'daily', time: '06:00' }, refreshType: 'full', enabled: true, lastRun: { status: 'Completed', timestamp: '2026-06-05T06:00:00-03:00' } }),
    sched({ id: 'sch-2', datasetId: 'ds-ventas-retail', workspaceId: 'ws-ventas', tables: ['Productos'], frequency: { kind: 'hourly', everyHours: 4 }, refreshType: 'dataOnly', enabled: true, lastRun: { status: 'InProgress', timestamp: '2026-06-05T12:00:00-03:00' } }),
    sched({ id: 'sch-3', datasetId: 'ds-pyl', workspaceId: 'ws-finanzas', tables: ['Asientos', 'CentrosDeCosto'], frequency: { kind: 'monthly', dayOfMonth: 1, time: '01:00' }, refreshType: 'full', enabled: true, lastRun: { status: 'Failed', timestamp: '2026-06-01T01:00:00-03:00' } }),
    sched({ id: 'sch-4', datasetId: 'ds-logistica', workspaceId: 'ws-ops', tables: ['Envios'], frequency: { kind: 'weekly', daysOfWeek: [3], time: '07:30' }, refreshType: 'calculate', enabled: true, lastRun: { status: 'Completed', timestamp: '2026-06-04T07:30:00-03:00' } }),
    sched({ id: 'sch-5', datasetId: 'ds-inventario', workspaceId: 'ws-ops', tables: ['Stock', 'Movimientos', 'Depositos'], frequency: { kind: 'monthly', dayOfMonth: LAST_DAY, time: '23:00' }, refreshType: 'full', enabled: false, lastRun: { status: 'Completed', timestamp: '2026-05-31T23:00:00-03:00' } }),
    sched({ id: 'sch-6', datasetId: 'ds-tesoreria', workspaceId: 'ws-finanzas', tables: ['FlujoCaja'], frequency: { kind: 'daily', time: '08:00', daysOfWeek: [1, 2, 3, 4, 5] }, refreshType: 'dataOnly', enabled: true, lastRun: { status: 'InProgress', timestamp: '2026-06-05T08:00:00-03:00' } }),
  ]

  // Sincronizar scheduleId en las tablas referenciadas por cada schedule.
  for (const sch of schedules) {
    for (const name of sch.tables) {
      const t = tables.find((tb) => tb.datasetId === sch.datasetId && tb.name === name)
      if (t) t.scheduleId = sch.id
    }
  }

  return { workspaces, datasets, tables, schedules }
}
