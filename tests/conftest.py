import pytest
from pathlib import Path
import os, sys

# raiz do projeto (decky-file-explorer/)
ROOT = Path(__file__).resolve().parents[1]

# backend/ precisa estar no path ANTES de importar main
BACKEND = ROOT / "defaults/py_modules"
if not BACKEND.exists():
    BACKEND = ROOT / "py_modules"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(ROOT / "bin"))

from filesystem import FileSystemService

@pytest.fixture
def fs(tmp_path: Path):
    return FileSystemService(tmp_path)
