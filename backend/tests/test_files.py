import pytest
from backend.filesystem import FileAlreadyExistsError


def test_create_and_delete_file(fs):
    fs.create_file("a/b/file.bin", b"123")

    file_path = fs.base_dir / "a" / "b" / "file.bin"
    assert file_path.exists()

    fs.delete_file("a/b/file.bin")
    assert not file_path.exists()


def test_copy_and_move_file(fs):
    fs.create_file("file.txt", b"data")

    fs.copy("file.txt", "copy.txt")
    assert (fs.base_dir / "copy.txt").exists()

    fs.move("copy.txt", "moved.txt")
    assert (fs.base_dir / "moved.txt").exists()
    assert not (fs.base_dir / "copy.txt").exists()


def test_rename_file(fs):
    fs.create_file("old.txt", b"x")

    fs.rename("old.txt", "new.txt")

    assert (fs.base_dir / "new.txt").exists()
    assert not (fs.base_dir / "old.txt").exists()


def test_copy_overwrite(fs):
    fs.create_file("a.txt", b"old")
    fs.create_file("b.txt", b"new")

    fs.copy("a.txt", "b.txt", overwrite=True)

    assert (fs.base_dir / "b.txt").read_bytes() == b"old"


def test_open_write_stream_existing_file_raises(fs):
    fs.create_file("x.bin", b"1")

    with pytest.raises(FileAlreadyExistsError):
        fs.open_write_stream("x.bin")
