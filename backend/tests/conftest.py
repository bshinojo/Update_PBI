import pathlib
import sys

# Permite `import app...` corriendo pytest desde backend/ sin instalar el paquete.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
