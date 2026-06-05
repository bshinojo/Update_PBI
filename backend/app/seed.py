# Port de src/api/mock/seed.ts. Provee el "universo de lectura" (workspaces,
# datasets, tablas) para el modo data_source="seed", y los schedules iniciales
# con los que arranca el store si todavía no hay archivo de persistencia.
from .frequency import LAST_DAY, schedule_time
from .models import Dataset, LastRun, Schedule, TableInfo, Workspace

_WORKSPACES = [
    Workspace(id="ws-ventas", name="Ventas y Comercial"),
    Workspace(id="ws-finanzas", name="Finanzas"),
    Workspace(id="ws-ops", name="Operaciones"),
]

_DATASET_DEFS = [
    ("ds-ventas-retail", "Ventas Retail", "ws-ventas",
     ["Ventas", "Clientes", "Productos", "Sucursales", "Vendedores", "Promociones"]),
    ("ds-ventas-may", "Ventas Mayorista", "ws-ventas",
     ["Pedidos", "Cuentas", "Productos", "Descuentos"]),
    ("ds-pipeline", "Pipeline Comercial", "ws-ventas",
     ["Oportunidades", "Etapas", "Contactos", "Actividades", "Forecast"]),
    ("ds-pyl", "P&L Consolidado", "ws-finanzas",
     ["Asientos", "CentrosDeCosto", "Cuentas", "Periodos", "Presupuesto"]),
    ("ds-tesoreria", "Tesorería", "ws-finanzas",
     ["FlujoCaja", "Bancos", "Conciliaciones", "Pagos"]),
    ("ds-logistica", "Logística", "ws-ops",
     ["Envios", "Rutas", "Transportistas", "Entregas", "Costos", "Zonas", "Devoluciones"]),
    ("ds-inventario", "Inventario", "ws-ops",
     ["Stock", "Movimientos", "Depositos", "Lotes", "Ajustes"]),
    ("ds-rrhh", "RRHH", "ws-ops",
     ["Empleados", "Liquidaciones", "Ausencias", "Capacitaciones", "Legajos", "Evaluaciones"]),
    ("ds-calidad", "Calidad", "ws-ops",
     ["Inspecciones", "Defectos", "Auditorias", "NoConformidades"]),
]


def seed_workspaces() -> list[Workspace]:
    return [w.model_copy(deep=True) for w in _WORKSPACES]


def seed_datasets() -> list[Dataset]:
    return [
        Dataset(id=did, name=name, workspace_id=ws)
        for did, name, ws, _tables in _DATASET_DEFS
    ]


def seed_tables() -> list[TableInfo]:
    out: list[TableInfo] = []
    for did, _name, _ws, tables in _DATASET_DEFS:
        for t in tables:
            out.append(TableInfo(name=t, dataset_id=did))
    return out


def _sched(**kwargs) -> Schedule:
    # Construimos con time="" para que Pydantic convierta el dict `frequency` en su
    # modelo de unión, y recién ahí derivamos el time canónico (espejo denormalizado).
    sch = Schedule(time="", **kwargs)
    sch.time = schedule_time(sch.frequency)
    return sch


def seed_schedules() -> list[Schedule]:
    return [
        _sched(id="sch-1", dataset_id="ds-ventas-retail", workspace_id="ws-ventas",
               tables=["Ventas", "Clientes"], frequency={"kind": "daily", "time": "06:00"},
               refresh_type="full", enabled=True,
               last_run=LastRun(status="Completed", timestamp="2026-06-05T06:00:00-03:00")),
        _sched(id="sch-2", dataset_id="ds-ventas-retail", workspace_id="ws-ventas",
               tables=["Productos"], frequency={"kind": "hourly", "every_hours": 4},
               refresh_type="dataOnly", enabled=True,
               last_run=LastRun(status="InProgress", timestamp="2026-06-05T12:00:00-03:00")),
        _sched(id="sch-3", dataset_id="ds-pyl", workspace_id="ws-finanzas",
               tables=["Asientos", "CentrosDeCosto"],
               frequency={"kind": "monthly", "day_of_month": 1, "time": "01:00"},
               refresh_type="full", enabled=True,
               last_run=LastRun(status="Failed", timestamp="2026-06-01T01:00:00-03:00")),
        _sched(id="sch-4", dataset_id="ds-logistica", workspace_id="ws-ops",
               tables=["Envios"],
               frequency={"kind": "weekly", "days_of_week": [1, 3, 5], "time": "07:30"},
               refresh_type="calculate", enabled=True,
               last_run=LastRun(status="Completed", timestamp="2026-06-04T07:30:00-03:00")),
        _sched(id="sch-5", dataset_id="ds-inventario", workspace_id="ws-ops",
               tables=["Stock", "Movimientos", "Depositos"],
               frequency={"kind": "monthly", "day_of_month": LAST_DAY, "time": "23:00"},
               refresh_type="full", enabled=False,
               last_run=LastRun(status="Completed", timestamp="2026-05-31T23:00:00-03:00")),
        _sched(id="sch-6", dataset_id="ds-tesoreria", workspace_id="ws-finanzas",
               tables=["FlujoCaja"], frequency={"kind": "daily", "time": "08:00"},
               refresh_type="dataOnly", enabled=True,
               last_run=LastRun(status="InProgress", timestamp="2026-06-05T08:00:00-03:00")),
    ]
