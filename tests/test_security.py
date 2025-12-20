import pytest
from filesystem import FileSystemError

@pytest.mark.parametrize("path", [
    "../",
    "../../etc",
    "/etc/passwd",
    "~/secret",
])
def test_path_traversal_blocked(fs, path):
    with pytest.raises(FileSystemError):
        fs.list_dir(path)
