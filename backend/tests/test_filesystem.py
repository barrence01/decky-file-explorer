import pytest
from pathlib import Path
from aiohttp import web
from aiohttp.test_utils import make_mocked_request
from aiohttp import FormData

from backend.filesystem import (
    FileSystemService,
    FileSystemError,
)


# ------------------------
# Fixtures
# ------------------------

@pytest.fixture
def fs(tmp_path: Path):
    """
    Creates a FileSystemService rooted at a temporary directory.
    """
    return FileSystemService(tmp_path)


# ------------------------
# Directory listing
# ------------------------

def test_list_empty_directory(fs, tmp_path):
    items = fs.list_dir("")
    assert items == []


def test_list_directory_with_files(fs, tmp_path):
    (tmp_path / "file.txt").write_text("hello")
    (tmp_path / "dir").mkdir()

    items = fs.list_dir("")

    names = {item.path.name for item in items}
    assert names == {"file.txt", "dir"}


# ------------------------
# FileSystemObject behavior
# ------------------------

def test_file_object_properties(fs, tmp_path):
    file_path = tmp_path / "test.txt"
    file_path.write_text("content")

    obj = fs.get_object("test.txt")

    assert obj.isFile()
    assert not obj.isDir()
    assert obj.getFileName() == "test.txt"
    assert obj.getFileExtension() == ".txt"
    assert obj.getSize() > 0
    assert obj.getFileType() == "text"


def test_directory_object_properties(fs, tmp_path):
    (tmp_path / "docs").mkdir()

    obj = fs.get_object("docs")

    assert obj.isDir()
    assert not obj.isFile()

    with pytest.raises(IsADirectoryError):
        obj.getFileName()

    with pytest.raises(IsADirectoryError):
        obj.getFileExtension()


# ------------------------
# Create / delete files
# ------------------------

def test_create_and_delete_file(fs, tmp_path):
    fs.create_file("a/b/file.bin", b"123")

    file_path = tmp_path / "a" / "b" / "file.bin"
    assert file_path.exists()

    fs.delete_file("a/b/file.bin")
    assert not file_path.exists()


# ------------------------
# Create / delete directories
# ------------------------

def test_create_and_delete_directory(fs, tmp_path):
    fs.create_dir("newdir")
    assert (tmp_path / "newdir").is_dir()

    fs.delete_dir("newdir")
    assert not (tmp_path / "newdir").exists()


# ------------------------
# Move / copy / rename
# ------------------------

def test_copy_and_move_file(fs, tmp_path):
    fs.create_file("file.txt", b"data")

    fs.copy("file.txt", "copy.txt")
    assert (tmp_path / "copy.txt").exists()

    fs.move("copy.txt", "moved.txt")
    assert (tmp_path / "moved.txt").exists()
    assert not (tmp_path / "copy.txt").exists()


def test_rename_file(fs, tmp_path):
    fs.create_file("old.txt", b"x")

    fs.rename("old.txt", "new.txt")

    assert (tmp_path / "new.txt").exists()
    assert not (tmp_path / "old.txt").exists()


# ------------------------
# Security: path traversal
# ------------------------

def test_path_traversal_blocked(fs):
    with pytest.raises(FileSystemError):
        fs.list_dir("../")


# ------------------------
# Stream: Streaming file in chunks
# ------------------------

def test_stream_read_and_write(fs, tmp_path):
    data = b"x" * (1024 * 1024)  # 1 MB

    fs.create_file("big.bin", data)

    collected = b"".join(fs.stream_read("big.bin"))
    assert collected == data

# ------------------------
# Write stream
# ------------------------

def test_open_write_stream(fs, tmp_path):
    stream = fs.open_write_stream("streamed.bin")

    try:
        stream.write(b"hello ")
        stream.write(b"world")
    finally:
        stream.close()

    assert (tmp_path / "streamed.bin").read_bytes() == b"hello world"


# ------------------------
# copy_streamed
# ------------------------

def test_copy_streamed(fs, tmp_path):
    data = b"A" * 1024 * 512  # 512 KB
    fs.create_file("src.bin", data)

    fs.copy_streamed("src.bin", "dst.bin")

    assert (tmp_path / "dst.bin").read_bytes() == data


# ------------------------
# get_object errors
# ------------------------

def test_get_object_not_found(fs):
    with pytest.raises(FileNotFoundError):
        fs.get_object("missing.txt")


# ------------------------
# stream_read errors
# ------------------------

def test_stream_read_non_file(fs):
    fs.create_dir("dir")

    with pytest.raises(FileNotFoundError):
        list(fs.stream_read("dir"))


# ------------------------
# aiohttp: download
# ------------------------

@pytest.mark.asyncio
async def test_download_handler(aiohttp_client, tmp_path):
    fs = FileSystemService(tmp_path)
    fs.create_file("file.txt", b"downloaded")

    app = web.Application()
    app["fs"] = fs
    app.router.add_get("/download", lambda r: __import__(
        "backend.filesystem").filesystem.download(r)
    )

    client = await aiohttp_client(app)

    resp = await client.get("/download", params={"path": "file.txt"})
    assert resp.status == 200

    body = await resp.read()
    assert body == b"downloaded"
    assert "attachment" in resp.headers["Content-Disposition"]


# ------------------------
# aiohttp: upload
# ------------------------

@pytest.mark.asyncio
async def test_upload_handler(aiohttp_client, tmp_path):
    fs = FileSystemService(tmp_path)

    app = web.Application()
    app["fs"] = fs
    app.router.add_post("/upload", lambda r: __import__(
        "backend.filesystem").filesystem.upload(r)
    )

    client = await aiohttp_client(app)

    data = FormData()
    data.add_field(
        "file",
        b"uploaded content",
        filename="upload.txt",
        content_type="text/plain",
    )

    resp = await client.post("/upload", data=data)
    assert resp.status == 200

    uploaded = tmp_path / "uploads" / "upload.txt"
    assert uploaded.exists()
    assert uploaded.read_bytes() == b"uploaded content"