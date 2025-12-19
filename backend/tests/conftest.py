import pytest
from pathlib import Path
from backend.filesystem import FileSystemService
import os, sys

# raiz do projeto (decky-file-explorer/)
ROOT = Path(__file__).resolve().parents[2]

# backend/ precisa estar no path ANTES de importar main
BACKEND = ROOT / "backend"

sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(BACKEND))

@pytest.fixture
def fs(tmp_path: Path):
    return FileSystemService(tmp_path)
