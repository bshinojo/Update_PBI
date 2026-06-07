# Datos de ejemplo SOLO para los tests (antes vivían en app/seed.py, que era un modo
# de runtime; al pasar la app a Power BI-only, estos datos quedan como fixture de la
# suite). Proveen un "universo de lectura" (workspaces/datasets/tablas) vía una
# DataSource falsa y un set de schedules iniciales para precargar el store.
from app.frequency import LAST_DAY, schedule_time
from app.models import Dataset, LastRun, Schedule, TableInfo, Workspace

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


class FakeDataSource:
    """DataSource en memoria para los tests (no requiere credenciales ni red)."""

    def __init__(self) -> None:
        self._workspaces = [w.model_copy(deep=True) for w in _WORKSPACES]
        self._datasets = [
            Dataset(id=did, name=name, workspace_id=ws)
            for did, name, ws, _tables in _DATASET_DEFS
        ]
        self._tables = [
            TableInfo(name=t, dataset_id=did)
            for did, _name, _ws, tables in _DATASET_DEFS
            for t in tables
        ]

    def list_workspaces(self) -> list[Workspace]:
        return [w.model_copy(deep=True) for w in self._workspaces]

    def list_datasets(self, workspace_id: str) -> list[Dataset]:
        return [d.model_copy(deep=True) for d in self._datasets if d.workspace_id == workspace_id]

    def list_tables(self, dataset_id: str) -> list[TableInfo]:
        return [t.model_copy(deep=True) for t in self._tables if t.dataset_id == dataset_id]


def _sched(**kwargs) -> Schedule:
    # time="" para que Pydantic convierta el dict `frequency` en su modelo de unión;
    # recién ahí derivamos el time canónico (espejo denormalizado).
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
               frequency={"kind": "weekly", "days_of_week": [3], "time": "07:30"},
               refresh_type="calculate", enabled=True,
               last_run=LastRun(status="Completed", timestamp="2026-06-04T07:30:00-03:00")),
        _sched(id="sch-5", dataset_id="ds-inventario", workspace_id="ws-ops",
               tables=["Stock", "Movimientos", "Depositos"],
               frequency={"kind": "monthly", "day_of_month": LAST_DAY, "time": "23:00"},
               refresh_type="full", enabled=False,
               last_run=LastRun(status="Completed", timestamp="2026-05-31T23:00:00-03:00")),
        _sched(id="sch-6", dataset_id="ds-tesoreria", workspace_id="ws-finanzas",
               tables=["FlujoCaja"],
               frequency={"kind": "daily", "time": "08:00", "days_of_week": [1, 2, 3, 4, 5]},
               refresh_type="dataOnly", enabled=True,
               last_run=LastRun(status="InProgress", timestamp="2026-06-05T08:00:00-03:00")),
    ]
