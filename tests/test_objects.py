import pytest
import re

ISO_TIMESTAMP_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")

def test_file_object_properties(fs):
    fs.create_file("test.txt", b"content")
    obj = fs.get_object("test.txt")

    assert obj.isFile()
    assert not obj.isDir()
    assert obj.getFileName() == "test.txt"
    assert obj.getFileExtension() == ".txt"
    assert obj.getSize() == 7
    assert obj.getFileType() == "text"


def test_directory_object_properties(fs):
    fs.create_dir("docs")
    obj = fs.get_object("docs")

    assert obj.isDir()
    assert not obj.isFile()

    with pytest.raises(IsADirectoryError):
        obj.getFileName()

    with pytest.raises(IsADirectoryError):
        obj.getFileExtension()


def test_to_dict_file(fs):
    fs.create_file("a.txt", b"123")
    data = fs.get_object("a.txt").to_dict()

    assert data["isFile"] is True
    assert data["name"] == "a.txt"
    assert data["extension"] == ".txt"
    assert data["size"] == 3
    assert data["type"] == "text"
    assert data["isWritable"] is True


def test_is_writable_file(fs, monkeypatch):
    fs.create_file("a.txt", b"123")
    obj = fs.get_object("a.txt")

    monkeypatch.setattr("filesystem.os.access", lambda path, mode: False)
    assert obj.isWritable() is False


def test_to_dict_directory(fs):
    fs.create_dir("docs")
    fs.create_file("docs/a.txt", b"x")

    data = fs.get_object("docs").to_dict()

    assert data["isDir"] is True
    assert data["itemsCount"] == 1


def test_to_dict_includes_timestamps(fs):
    fs.create_file("a.txt", b"123")
    fs.create_dir("docs")

    file_data = fs.get_object("a.txt").to_dict()
    dir_data = fs.get_object("docs").to_dict()

    for data in (file_data, dir_data):
        assert ISO_TIMESTAMP_PATTERN.match(data["modifiedAt"])
        assert ISO_TIMESTAMP_PATTERN.match(data["createdAt"])


def test_created_time_fallback(fs):
    fs.create_file("a.txt", b"123")
    obj = fs.get_object("a.txt")
    stat = obj.path.stat()

    class StatWithoutBirthtime:
        st_mtime = stat.st_mtime
        st_ctime = stat.st_ctime

    obj._cached_stat = StatWithoutBirthtime()
    obj._stat_checked = True

    assert obj.getCreatedTime() == stat.st_ctime


def test_to_dict_omits_timestamps_when_stat_fails(tmp_path):
    from filesystem import FileSystemObject

    broken_link = tmp_path / "steam"
    broken_link.symlink_to(tmp_path / "missing-target")

    data = FileSystemObject(broken_link).to_dict()

    assert "modifiedAt" not in data
    assert "createdAt" not in data
    assert data["isProtected"] is True
