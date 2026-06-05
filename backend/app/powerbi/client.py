# Cliente de la REST API de Power BI. Autentica con el flujo client-credentials
# (service principal) y cachea el token hasta poco antes de que expire.
#
# IMPORTANTE: hasta no tener credenciales no se pudo probar contra el servicio
# real. Los endpoints de listado y el enhanced refresh siguen la documentación
# oficial; verificar `list_tables` cuando haya un dataset real (depende de que el
# dataset tenga XMLA/ejecución de consultas habilitado). El modo por defecto es
# "seed", así que esto solo corre cuando PBI_DATA_SOURCE=powerbi.
import time
from typing import Any

import httpx

from ..config import Settings
from ..models import Dataset, TableInfo, Workspace

# Mapeo de nuestro RefreshType al "type" del enhanced refresh de Power BI.
# Coincide 1:1 con los valores que acepta el servicio.
_REFRESH_TYPE_MAP = {"full": "full", "dataOnly": "dataOnly", "calculate": "calculate"}


class PowerBIError(Exception):
    """Falla al hablar con Power BI (auth o REST)."""


class PowerBIClient:
    def __init__(self, settings: Settings, timeout: float = 30.0) -> None:
        missing = [
            name
            for name, val in (
                ("PBI_TENANT_ID", settings.tenant_id),
                ("PBI_CLIENT_ID", settings.client_id),
                ("PBI_CLIENT_SECRET", settings.client_secret),
            )
            if not val
        ]
        if missing:
            raise PowerBIError(
                "Faltan credenciales de Power BI: " + ", ".join(missing) +
                ". Completalas en el .env o poné PBI_DATA_SOURCE=seed."
            )
        self._s = settings
        self._client = httpx.Client(timeout=timeout)
        self._token: str | None = None
        self._token_exp: float = 0.0

    # --- Auth ---

    def _access_token(self) -> str:
        # Renovamos 60s antes de la expiración real para evitar carreras.
        if self._token and time.time() < self._token_exp - 60:
            return self._token
        url = f"{self._s.authority}/{self._s.tenant_id}/oauth2/v2.0/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": self._s.client_id,
            "client_secret": self._s.client_secret,
            "scope": self._s.scope,
        }
        try:
            res = self._client.post(url, data=data)
            res.raise_for_status()
        except httpx.HTTPError as e:
            raise PowerBIError(f"No se pudo obtener el token de Azure AD: {e}") from e
        payload = res.json()
        self._token = payload["access_token"]
        self._token_exp = time.time() + float(payload.get("expires_in", 3600))
        return self._token

    def _get(self, path: str) -> Any:
        return self._request("GET", path)

    def _send(self, method: str, path: str, json: Any = None) -> httpx.Response:
        url = f"{self._s.api_base}{path}"
        headers = {"Authorization": f"Bearer {self._access_token()}"}
        try:
            res = self._client.request(method, url, headers=headers, json=json)
            res.raise_for_status()
        except httpx.HTTPError as e:
            raise PowerBIError(f"Error llamando a Power BI ({method} {path}): {e}") from e
        return res

    def _request(self, method: str, path: str, json: Any = None) -> Any:
        res = self._send(method, path, json)
        if res.status_code == 204 or not res.content:
            return None
        return res.json()

    # --- Lecturas ---

    def list_workspaces(self) -> list[Workspace]:
        data = self._get("/groups")
        return [Workspace(id=g["id"], name=g["name"]) for g in data.get("value", [])]

    def list_datasets(self, workspace_id: str) -> list[Dataset]:
        data = self._get(f"/groups/{workspace_id}/datasets")
        return [
            Dataset(id=d["id"], name=d["name"], workspace_id=workspace_id)
            for d in data.get("value", [])
        ]

    def list_tables(self, dataset_id: str) -> list[TableInfo]:
        # No hay un endpoint REST directo para las tablas de un dataset de importación;
        # las pedimos vía DAX (INFO.VIEW.TABLES). Requiere XMLA/ejecución de consultas
        # habilitado en la capacidad. Si falla, devolvemos lista vacía para no romper
        # la navegación (el front muestra su estado "sin resultados").
        body = {"queries": [{"query": "EVALUATE INFO.VIEW.TABLES()"}],
                "serializerSettings": {"includeNulls": True}}
        try:
            data = self._request("POST", f"/datasets/{dataset_id}/executeQueries", json=body)
        except PowerBIError:
            return []
        rows = data["results"][0]["tables"][0]["rows"]
        names: list[str] = []
        for row in rows:
            name = row.get("[Name]") or row.get("Name")
            # INFO.VIEW.TABLES no expone tablas ocultas de sistema, pero filtramos por las dudas.
            if name and not str(name).startswith("DateTableTemplate") and not str(name).startswith("LocalDateTable"):
                names.append(str(name))
        return [TableInfo(name=n, dataset_id=dataset_id) for n in names]

    # --- Ejecución y polling (las usa el scheduler) ---

    def refresh_dataset(
        self,
        dataset_id: str,
        tables: list[str],
        refresh_type: str,
        group_id: str | None = None,
    ) -> str | None:
        """Dispara un enhanced refresh selectivo (lista de tablas + tipo) y devuelve el
        id del refresh para pollear su estado, o None si Power BI no lo informa. Con
        `group_id` (el workspace del dataset) usa la ruta con grupo, que es la que
        corresponde para datasets que no están en "Mi área de trabajo".

        ⚠️ El enhanced refresh es ASÍNCRONO: el POST devuelve 202 y el refresh sigue
        corriendo. El id sale del header `Location` (.../refreshes/{id}) o, en su
        defecto, de `x-ms-request-id`. Verificar estos nombres contra el servicio real."""
        body = {
            "type": _REFRESH_TYPE_MAP.get(refresh_type, "full"),
            "commitMode": "transactional",
            "objects": [{"table": t} for t in tables],
        }
        prefix = f"/groups/{group_id}" if group_id else ""
        res = self._send("POST", f"{prefix}/datasets/{dataset_id}/refreshes", json=body)
        location = res.headers.get("Location") or res.headers.get("location")
        if location:
            return location.rstrip("/").rsplit("/", 1)[-1]
        return res.headers.get("x-ms-request-id") or res.headers.get("RequestId")

    def get_refresh_status(
        self,
        dataset_id: str,
        refresh_id: str,
        group_id: str | None = None,
    ) -> str:
        """Estado crudo de un refresh ('Unknown' = en curso para enhanced refresh,
        'Completed', 'Failed', 'Cancelled', 'Disabled'). El mapeo a nuestro RunStatus
        lo hace executor._map_status."""
        prefix = f"/groups/{group_id}" if group_id else ""
        data = self._request("GET", f"{prefix}/datasets/{dataset_id}/refreshes/{refresh_id}")
        return (data or {}).get("status", "Unknown")
