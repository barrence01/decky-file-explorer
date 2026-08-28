import pytest
import pytest_asyncio
import asyncio
import time
from pathlib import Path
from aiohttp import FormData
from aiohttp.test_utils import TestClient

from filesystem import FileSystemService
import server
from server import WebServer, AUTH_COOKIE, _sync_list_dir_payload

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


@pytest.mark.asyncio
async def test_spa_routes_serve_index(client):
    for route in ("/files", "/login", "/recordings"):
        res = await client.get(route)
        assert res.status == 200
        assert await res.text() == "<html>OK</html>"


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
    assert "parentPath" in data["selectedDir"]
    assert "canNavigateUp" in data["selectedDir"]
    assert "breadcrumbs" in data
    assert isinstance(data["breadcrumbs"], list)
    assert len(data["dirContent"]) == 1


@pytest.mark.asyncio
async def test_list_dir_invalid(client):
    await login(client)

    res = await client.post(
        "/api/dir/list",
        json={"path": "missing"},
    )

    assert res.status == 404
    data = await res.json()
    assert data["code"] == "not_found"


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
async def test_create_dir_with_parent_and_name(client, fs):
    await login(client)

    fs.create_dir("parent")

    res = await client.post(
        "/api/dir/create",
        json={"parentPath": str(fs.base_dir / "parent"), "name": "child"},
    )
    assert res.status == 200
    assert (fs.base_dir / "parent" / "child").exists()


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


@pytest.mark.asyncio
async def test_upload_conflict_returns_suggested_name(client, fs):
    await login(client)

    fs.create_dir("uploads")
    fs.create_file("uploads/file.txt", b"existing")

    data = FormData()
    data.add_field("path", "uploads")
    data.add_field(
        "file",
        b"new content",
        filename="file.txt",
        content_type="text/plain",
    )

    res = await client.post("/api/dir/upload", data=data)
    payload = await res.json()

    assert res.status == 409
    assert payload["error"] == "conflict"
    assert payload["files"] == ["file.txt"]
    assert payload["suggestedName"] == "file (1).txt"


@pytest.mark.asyncio
async def test_upload_overwrite_existing_file(client, fs):
    await login(client)

    fs.create_dir("uploads")
    fs.create_file("uploads/file.txt", b"existing")

    data = FormData()
    data.add_field("path", "uploads")
    data.add_field("overwrite", "true")
    data.add_field(
        "file",
        b"replaced",
        filename="file.txt",
        content_type="text/plain",
    )

    res = await client.post("/api/dir/upload", data=data)

    assert res.status == 200
    assert (fs.base_dir / "uploads/file.txt").read_bytes() == b"replaced"


@pytest.mark.asyncio
async def test_upload_with_alternate_filename(client, fs):
    await login(client)

    fs.create_dir("uploads")
    fs.create_file("uploads/file.txt", b"existing")

    data = FormData()
    data.add_field("path", "uploads")
    data.add_field("filename", "file (1).txt")
    data.add_field(
        "file",
        b"copy",
        filename="file.txt",
        content_type="text/plain",
    )

    res = await client.post("/api/dir/upload", data=data)

    assert res.status == 200
    assert (fs.base_dir / "uploads/file.txt").read_bytes() == b"existing"
    assert (fs.base_dir / "uploads/file (1).txt").read_bytes() == b"copy"


# ------------------------
# TEXT FILE
# ------------------------

@pytest.mark.asyncio
async def test_read_text_file(client, fs):
    await login(client)

    fs.create_file("notes.txt", b"hello world")

    res = await client.get("/api/file/text?path=notes.txt")
    payload = await res.json()

    assert res.status == 200
    assert payload["content"] == "hello world"
    assert payload["size"] == 11
    assert payload["isWritable"] is True


@pytest.mark.asyncio
async def test_read_text_file_too_large(client, fs):
    await login(client)

    fs.create_file("big.txt", b"x" * 600_000)

    res = await client.get("/api/file/text?path=big.txt")

    assert res.status == 413


@pytest.mark.asyncio
async def test_write_text_file(client, fs):
    await login(client)

    fs.create_file("notes.txt", b"old")

    res = await client.put(
        "/api/file/text",
        json={"path": "notes.txt", "content": "updated"},
    )

    assert res.status == 200
    assert (fs.base_dir / "notes.txt").read_text(encoding="utf-8") == "updated"


@pytest.mark.asyncio
async def test_write_text_file_forbidden(client, fs, monkeypatch):
    await login(client)

    fs.create_file("notes.txt", b"old")
    monkeypatch.setattr("filesystem.os.access", lambda path, mode: False)

    res = await client.put(
        "/api/file/text",
        json={"path": "notes.txt", "content": "updated"},
    )

    assert res.status == 403


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
async def test_rename_blocks_path_injection(client, fs):
    await login(client)

    fs.create_file("file.txt", b"x")

    res = await client.post(
        "/api/file/rename",
        json={"path": "file.txt", "newName": "../escape.txt"},
    )

    assert res.status == 400
    data = await res.json()
    assert data["code"] == "invalid_name"
    assert (fs.base_dir / "file.txt").exists()
    assert not (fs.base_dir / "escape.txt").exists()


@pytest.mark.asyncio
async def test_list_dir_access_denied_payload(client, fs, monkeypatch):
    await login(client)

    fs.create_dir("locked")

    def raise_permission(_self):
        raise PermissionError("denied")

    monkeypatch.setattr("pathlib.Path.iterdir", raise_permission)

    res = await client.post(
        "/api/dir/list",
        json={"path": "locked"},
    )

    assert res.status == 403
    data = await res.json()
    assert data["code"] == "access_denied"
    assert data["canNavigateUp"] is True
    assert data["parentPath"] is not None


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


# ------------------------
# REQUEST TIMEOUT
# ------------------------

@pytest.mark.asyncio
async def test_request_timeout_returns_504(aiohttp_client, monkeypatch):
    import asyncio
    from aiohttp import web

    import server

    monkeypatch.setattr(server, "REQUEST_TIMEOUT_SECONDS", 0.1)

    async def slow_ping(request):
        await asyncio.sleep(0.3)
        return web.json_response({"status": "ok"})

    app = web.Application(middlewares=[server.request_timeout_middleware])
    app.router.add_get("/api/ping", slow_ping)

    client = await aiohttp_client(app)
    res = await client.get("/api/ping")

    assert res.status == 504
    data = await res.json()
    assert data["error"] == "Request timed out"


@pytest.mark.asyncio
async def test_request_timeout_exempt_download(aiohttp_client, monkeypatch):
    import asyncio
    from aiohttp import web

    import server

    monkeypatch.setattr(server, "REQUEST_TIMEOUT_SECONDS", 0.1)

    async def slow_download(request):
        await asyncio.sleep(0.3)
        return web.json_response({"status": "ok"})

    app = web.Application(middlewares=[server.request_timeout_middleware])
    app.router.add_post("/api/dir/download", slow_download)

    client = await aiohttp_client(app)
    res = await client.post("/api/dir/download", json={"paths": ["file.txt"]})

    assert res.status == 200
    assert (await res.json())["status"] == "ok"


@pytest.mark.asyncio
async def test_request_timeout_exempt_upload(aiohttp_client, monkeypatch):
    import asyncio
    from aiohttp import web

    import server

    monkeypatch.setattr(server, "REQUEST_TIMEOUT_SECONDS", 0.1)

    async def slow_upload(request):
        await asyncio.sleep(0.3)
        return web.json_response({"status": "ok"})

    app = web.Application(middlewares=[server.request_timeout_middleware])
    app.router.add_post("/api/dir/upload", slow_upload)

    client = await aiohttp_client(app)
    res = await client.post("/api/dir/upload")

    assert res.status == 200


@pytest.mark.asyncio
async def test_request_timeout_exempt_view_file(aiohttp_client, monkeypatch):
    import asyncio
    from aiohttp import web

    import server

    monkeypatch.setattr(server, "REQUEST_TIMEOUT_SECONDS", 0.1)

    async def slow_view(request):
        await asyncio.sleep(0.3)
        return web.Response(body=b"content")

    app = web.Application(middlewares=[server.request_timeout_middleware])
    app.router.add_get("/api/file/view", slow_view)

    client = await aiohttp_client(app)
    res = await client.get("/api/file/view?path=file.txt")

    assert res.status == 200
    assert await res.read() == b"content"


@pytest.mark.asyncio
async def test_request_timeout_exempt_assemble_clip(aiohttp_client, monkeypatch):
    import asyncio
    from aiohttp import web

    import server

    monkeypatch.setattr(server, "REQUEST_TIMEOUT_SECONDS", 0.1)

    async def slow_assemble(request):
        await asyncio.sleep(0.3)
        return web.json_response({"status": "ok"})

    app = web.Application(middlewares=[server.request_timeout_middleware])
    app.router.add_post("/api/steam/clips/assemble", slow_assemble)

    client = await aiohttp_client(app)
    res = await client.post("/api/steam/clips/assemble", json={"mpd": "/tmp/session.mpd"})

    assert res.status == 200


@pytest.mark.asyncio
async def test_event_loop_not_blocked_by_slow_list_dir(client, monkeypatch):
    await login(client)

    original = _sync_list_dir_payload

    def slow_list_dir_payload(fs, path):
        time.sleep(0.5)
        return original(fs, path)

    monkeypatch.setattr(server, "_sync_list_dir_payload", slow_list_dir_payload)

    list_task = asyncio.create_task(
        client.post("/api/dir/list", json={"path": ""})
    )

    await asyncio.sleep(0.05)

    started = time.monotonic()
    ping_res = await client.get("/api/ping")
    elapsed = time.monotonic() - started

    assert ping_res.status == 200
    assert elapsed < 0.2

    list_res = await list_task
    assert list_res.status == 200

