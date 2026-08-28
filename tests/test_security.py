import pytest
from filesystem import FileSystemError, PathAccessError
from path_utils import validate_path_segment


@pytest.mark.parametrize("path", [
    "../../etc",
    "~/secret",
])
def test_path_traversal_blocked(fs, path):
    with pytest.raises(FileSystemError):
        fs.list_dir(path)


def test_path_traversal_blocked_absolute(fs):
    with pytest.raises((FileSystemError, PathAccessError, NotADirectoryError)):
        fs.list_dir("/etc/passwd")


def test_list_dir_permission_denied_includes_parent(fs, monkeypatch):
    fs.create_dir("restricted")

    def raise_permission(_self):
        raise PermissionError("denied")

    monkeypatch.setattr(
        "pathlib.Path.iterdir",
        raise_permission,
    )

    with pytest.raises(PathAccessError) as exc_info:
        fs.list_dir("restricted")

    assert exc_info.value.code == "access_denied"
    assert exc_info.value.parent_path is not None

@pytest.mark.parametrize("name", [
    "../escape",
    "subdir/../../outside",
    "name/with/slash",
    "name\\with\\backslash",
    "",
    ".",
    "..",
])
def test_rename_blocks_malicious_names(fs, name):
    fs.create_file("file.txt", b"x")

    with pytest.raises((FileSystemError, ValueError)):
        fs.rename("file.txt", name)


@pytest.mark.parametrize("name", [
    "../secret",
    "bad/name",
    "\x00bad",
])
def test_validate_path_segment_rejects_invalid(name):
    with pytest.raises(ValueError):
        validate_path_segment(name)

