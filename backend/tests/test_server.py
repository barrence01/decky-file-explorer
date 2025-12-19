import pytest
import pytest_asyncio
from pathlib import Path
from aiohttp import FormData
from aiohttp.test_utils import TestClient

from backend.filesystem import FileSystemService
from backend.server import WebServer, AUTH_COOKIE


# ------------------------
# FIXTURES
# ------------------------

@pytest.fixture
def fs(tmp_path: Path):
    """
    Isolated filesystem rooted in pytest temp dir
    """
    return FileSystemService(str(tmp_path))


@pytest_asyncio.fixture
async def client(aiohttp_client, fs, tmp_path):
    """
    WebServer instance using temp filesystem and temp webui dir
    """
    # fake webui so static route does not explode
    webui = tmp_path / "webui"
    webui.mkdir()
    (webui / "index.html").write_text("<html>OK</html>")

    server = WebServer(
        base_dir=tmp_path,
        fs=fs,
        host="127.0.0.1",
        port=0,
    )

    return await aiohttp_client(server.app)


async def login(client: TestClient) -> str:
    """
    Logs in and injects auth cookie correctly
    """
    res = await client.post(
        "/api/login",
        json={"login": "admin", "password": "admin"},
    )
    assert res.status == 200

    token = res.cookies[AUTH_COOKIE].value
    client.session.cookie_jar.update_cookies({AUTH_COOKIE: token})
    return token


# ------------------------
# AUTH
# ------------------------

@pytest.mark.asyncio
async def test_login_success(client):
    res = await client.post(
        "/api/login",
        json={"login": "admin", "password": "admin"},
    )
    assert res.status == 200
    assert AUTH_COOKIE in res.cookies


@pytest.mark.asyncio
async def test_login_fail(client):
    res = await client.post(
        "/api/login",
        json={"login": "admin", "password": "wrong"},
    )
    assert res.status == 401


@pytest.mark.asyncio
async def test_is_logged_requires_auth(client):
    res = await client.get("/api/login/is-logged")
    assert res.status == 400


@pytest.mark.asyncio
async def test_is_logged_ok(client):
    await login(client)
    res = await client.get("/api/login/is-logged")
    assert res.status == 200
    assert (await res.json())["logged"] is True


@pytest.mark.asyncio
async def test_logoff(client):
    await login(client)
    res = await client.get("/api/logoff")
    assert res.status == 200


# ------------------------
# DIRECTORY LIST
# ------------------------

@pytest.mark.asyncio
async def test_list_dir(client, fs):
    await login(client)

    fs.create_dir("docs")
    fs.create_file("docs/file.txt", b"hello")

    res = await client.post(
        "/api/dir/list",
        json={"path": "docs"},
    )

    assert res.status == 200
    data = await res.json()

    assert data["selectedDir"]["isDir"] is True
    assert len(data["dirContent"]) == 1


@pytest.mark.asyncio
async def test_list_dir_invalid(client):
    await login(client)

    res = await client.post(
        "/api/dir/list",
        json={"path": "missing"},
    )

    assert res.status == 400


# ------------------------
# CREATE / DELETE
# ------------------------

@pytest.mark.asyncio
async def test_create_and_delete_dir(client, fs):
    await login(client)

    res = await client.post(
        "/api/dir/create",
        json={"path": "newdir"},
    )
    assert res.status == 200
    assert (fs.base_dir / "newdir").exists()

    res = await client.post(
        "/api/dir/delete",
        json={"paths": ["newdir"]},
    )
    assert res.status == 200
    assert not (fs.base_dir / "newdir").exists()


# ------------------------
# RENAME
# ------------------------

@pytest.mark.asyncio
async def test_rename_file(client, fs):
    await login(client)

    fs.create_file("old.txt", b"x")

    res = await client.post(
        "/api/file/rename",
        json={"path": "old.txt", "newName": "new.txt"},
    )

    assert res.status == 200
    assert (fs.base_dir / "new.txt").exists()


# ------------------------
# COPY / MOVE (PASTE)
# ------------------------

@pytest.mark.asyncio
async def test_copy_and_move(client, fs):
    await login(client)

    fs.create_file("a.txt", b"x")
    fs.create_dir("dest")

    # copy
    res = await client.post(
        "/api/dir/paste",
        json={
            "mode": "copy",
            "targetDir": "dest",
            "paths": ["a.txt"],
            "overwrite": False,
        },
    )
    assert res.status == 200
    assert (fs.base_dir / "dest/a.txt").exists()

    # move
    res = await client.post(
        "/api/dir/paste",
        json={
            "mode": "move",
            "targetDir": "dest",
            "paths": ["a.txt"],
            "overwrite": True,
        },
    )
    assert res.status == 200
    assert not (fs.base_dir / "a.txt").exists()


# ------------------------
# UPLOAD
# ------------------------

@pytest.mark.asyncio
async def test_upload(client, fs):
    await login(client)

    fs.create_dir("uploads")

    data = FormData()
    data.add_field("path", "uploads")
    data.add_field(
        "file",
        b"hello upload",
        filename="file.txt",
        content_type="text/plain",
    )

    res = await client.post(
        "/api/dir/upload",
        data=data,
    )

    assert res.status == 200
    assert (fs.base_dir / "uploads/file.txt").exists()


# ------------------------
# DOWNLOAD
# ------------------------

@pytest.mark.asyncio
async def test_download_single_file(client, fs):
    await login(client)

    fs.create_file("file.txt", b"download")

    res = await client.post(
        "/api/dir/download",
        json={"paths": ["file.txt"]},
    )

    assert res.status == 200
    assert await res.read() == b"download"


@pytest.mark.asyncio
async def test_download_zip(client, fs):
    await login(client)

    fs.create_file("a.txt", b"a")
    fs.create_file("b.txt", b"b")

    res = await client.post(
        "/api/dir/download",
        json={"paths": ["a.txt", "b.txt"]},
    )

    assert res.status == 200
    assert res.headers["Content-Type"] == "application/zip"


# ------------------------
# VIEW FILE + RANGE
# ------------------------

@pytest.mark.asyncio
async def test_view_file_range(client, fs):
    await login(client)

    fs.create_file("big.bin", b"0123456789")

    res = await client.get(
        "/api/file/view?path=big.bin",
        headers={"Range": "bytes=2-5"},
    )

    assert res.status == 206
    assert await res.read() == b"2345"
