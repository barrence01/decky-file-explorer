import pytest
import pytest_asyncio
from pathlib import Path
from aiohttp import FormData
from aiohttp.test_utils import TestClient

from filesystem import FileSystemService
from server import WebServer, AUTH_COOKIE

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
async def client(aiohttp_client, fs, tmp_path, monkeypatch):
    """
    WebServer instance using temp filesystem and temp webui dir
    """
    webui = tmp_path / "webui"
    webui.mkdir()
    (webui / "index.html").write_text("<html>OK</html>")

    monkeypatch.setattr(
        "server.WEBUI_DIR",
        webui
    )

    server = WebServer(
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

@pytest.mark.asyncio
async def test_login_missing_json(client):
    res = await client.post("/api/login", data=b"")
    assert res.status == 400


@pytest.mark.asyncio
async def test_login_missing_fields(client):
    res = await client.post("/api/login", json={"login": "admin"})
    assert res.status == 400


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

@pytest.mark.asyncio
async def test_delete_without_paths(client):
    await login(client)

    res = await client.post("/api/dir/delete", json={})
    assert res.status == 400

@pytest.mark.asyncio
async def test_create_dir_already_exists(client, fs):
    await login(client)

    fs.create_dir("dir")

    res = await client.post(
        "/api/dir/create",
        json={"path": "dir"},
    )

    assert res.status == 409

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

@pytest.mark.asyncio
async def test_rename_missing_data(client):
    await login(client)

    res = await client.post("/api/file/rename", json={})
    assert res.status == 400


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


@pytest.mark.asyncio
async def test_paste_conflict_without_overwrite(client, fs):
    await login(client)

    fs.create_file("a.txt", b"x")
    fs.create_dir("dest")
    fs.create_file("dest/a.txt", b"y")

    res = await client.post(
        "/api/dir/paste",
        json={
            "mode": "copy",
            "targetDir": "dest",
            "paths": ["a.txt"],
            "overwrite": False,
        },
    )

    assert res.status == 409
    data = await res.json()
    assert data["error"] == "conflict"
    assert "a.txt" in data["files"]

@pytest.mark.asyncio
async def test_paste_invalid_mode(client):
    await login(client)

    res = await client.post(
        "/api/dir/paste",
        json={"mode": "invalid", "paths": [], "targetDir": "x"},
    )

    assert res.status == 400


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

@pytest.mark.asyncio
async def test_upload_invalid_content_type(client):
    await login(client)

    res = await client.post(
        "/api/dir/upload",
        data=b"not multipart",
        headers={"Content-Type": "application/json"},
    )

    assert res.status == 415

@pytest.mark.asyncio
async def test_upload_missing_file(client, fs):
    await login(client)

    fs.create_dir("uploads")

    data = FormData()
    data.add_field("path", "uploads")

    res = await client.post("/api/dir/upload", data=data)
    assert res.status == 415


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
async def test_download_missing_paths(client):
    await login(client)

    res = await client.post("/api/dir/download", json={})
    assert res.status == 400


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

@pytest.mark.asyncio
async def test_view_file_full(client, fs):
    await login(client)

    fs.create_file("file.bin", b"abcdef")

    res = await client.get("/api/file/view?path=file.bin")
    assert res.status == 200
    assert await res.read() == b"abcdef"

@pytest.mark.asyncio
async def test_view_file_missing_path(client):
    await login(client)

    res = await client.get("/api/file/view")
    assert res.status == 400


@pytest.mark.asyncio
async def test_view_file_not_a_file(client, fs):
    await login(client)

    fs.create_dir("dir")

    res = await client.get("/api/file/view?path=dir")
    assert res.status == 400

@pytest.mark.asyncio
async def test_view_file_range_out_of_bounds(client, fs):
    await login(client)

    fs.create_file("file.bin", b"123")

    res = await client.get(
        "/api/file/view?path=file.bin",
        headers={"Range": "bytes=10-20"},
    )

    assert res.status == 416


# ------------------------
# PING
# ------------------------
@pytest.mark.asyncio
async def test_ping_requires_auth(client):
    res = await client.get("/api/ping")
    assert res.status == 400


@pytest.mark.asyncio
async def test_ping_ok(client):
    await login(client)
    res = await client.get("/api/ping")
    assert res.status == 200
    assert (await res.json())["status"] == "ok"

@pytest.mark.asyncio
async def test_list_dir_on_file_returns_error(client, fs):
    await login(client)

    fs.create_file("file.txt", b"x")

    res = await client.post(
        "/api/dir/list",
        json={"path": "file.txt"},
    )

    assert res.status == 400


# ------------------------
# CLIPS
# ------------------------

@pytest.mark.asyncio
async def test_list_steam_clips(client, monkeypatch):
    await login(client)

    monkeypatch.setattr(
        "gamerecording.scan_steam_recordings",
        lambda: [{"clipId": "123", "thumbnail": None}],
    )

    res = await client.get("/api/steam/clips")
    assert res.status == 200

    data = await res.json()
    assert data["count"] == 1

@pytest.mark.asyncio
async def test_get_steam_clip_thumbnail_not_found(client, monkeypatch):
    await login(client)

    monkeypatch.setattr(
        "gamerecording.scan_steam_recordings",
        lambda: [],
    )

    res = await client.get("/api/steam/clips/thumbnail/does-not-exist")
    assert res.status == 404

@pytest.mark.asyncio
async def test_assemble_clip_invalid_path(client):
    await login(client)

    res = await client.post(
        "/api/steam/clips/assemble",
        json={"mpd": "/tmp/not-session.mpd"},
    )

    assert res.status == 400

@pytest.mark.asyncio
async def test_assemble_clip_conflict(client, monkeypatch, tmp_path):
    await login(client)

    mpd = tmp_path / "session.mpd"
    mpd.parent.mkdir(parents=True, exist_ok=True)
    mpd.write_text("x")

    videos = tmp_path / "Videos"
    videos.mkdir()
    (videos / f"steam_{mpd.parent.parent.parent.name}.mp4").write_text("x")

    monkeypatch.setattr("server.get_videos_dir", lambda: videos)

    res = await client.post(
        "/api/steam/clips/assemble",
        json={"mpd": str(mpd), "overwrite": False},
    )

    assert res.status == 409
