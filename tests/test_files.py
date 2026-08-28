import pytest
from filesystem import FileAlreadyExistsError

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


def test_open_write_stream_overwrite(fs):
    fs.create_file("x.bin", b"old")

    stream = fs.open_write_stream("x.bin", overwrite=True)
    stream.write(b"new")
    stream.close()

    assert (fs.base_dir / "x.bin").read_bytes() == b"new"


def test_read_text_file(fs):
    fs.create_file("notes.txt", b"hello")

    result = fs.read_text("notes.txt")

    assert result["content"] == "hello"
    assert result["size"] == 5
    assert result["isWritable"] is True


def test_read_text_file_too_large(fs):
    fs.create_file("big.txt", b"x" * 600_000)

    with pytest.raises(ValueError, match="too large"):
        fs.read_text("big.txt", max_bytes=524_288)


def test_write_text_file(fs):
    fs.create_file("notes.txt", b"old")

    fs.write_text("notes.txt", "updated")

    assert (fs.base_dir / "notes.txt").read_text(encoding="utf-8") == "updated"
