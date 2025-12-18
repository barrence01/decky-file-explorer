import pytest
from pathlib import Path
from backend.filesystem import FileSystemService


@pytest.fixture
def fs(tmp_path: Path):
    return FileSystemService(tmp_path)
