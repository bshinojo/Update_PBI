import os
import pathlib
import sys
import tempfile

# Permite `import app...` corriendo pytest desde backend/ sin instalar el paquete.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

# La app es Power BI-only: dependencies.py construye el PowerBIClient al importar, y
# su __init__ exige credenciales. En tests las ponemos DUMMY: la construcción no
# autentica ni toca la red, y el cliente real nunca se usa (los tests overridean
# get_store/get_datasource con la FakeDataSource y el scheduler queda apagado).
# conftest se importa ANTES de cualquier módulo de test, así que esto corre antes
# del get_settings() cacheado. setdefault respeta overrides explícitos de la shell.
os.environ.setdefault("PBI_TENANT_ID", "test-tenant")
os.environ.setdefault("PBI_CLIENT_ID", "test-client")
os.environ.setdefault("PBI_CLIENT_SECRET", "test-secret")
os.environ.setdefault("PBI_SCHEDULER_ENABLED", "0")
os.environ.setdefault("PBI_DB_PATH", os.path.join(tempfile.gettempdir(), "pbi-test-singleton.json"))
