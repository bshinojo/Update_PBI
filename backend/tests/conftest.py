import os
import pathlib
import sys
import tempfile

# Permite `import app...` corriendo pytest desde backend/ sin instalar el paquete.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

# La suite debe correr hermética y "verde sin credenciales", sin importar que haya
# un backend/.env local apuntando a Power BI real. conftest se importa ANTES de
# cualquier módulo de test (y por ende antes del get_settings() cacheado en
# app.dependencies), así que fijamos acá el modo de datos, el scheduler y el path
# de la base. setdefault respeta un override explícito desde la shell.
os.environ.setdefault("PBI_DATA_SOURCE", "seed")
os.environ.setdefault("PBI_SCHEDULER_ENABLED", "0")
os.environ.setdefault("PBI_DB_PATH", os.path.join(tempfile.gettempdir(), "pbi-test-singleton.json"))
