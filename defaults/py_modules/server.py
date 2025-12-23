import aiohttp
from aiohttp import ClientConnectionResetError, web, BodyPartReader, MultipartReader
from pathlib import Path
from typing import Union
import asyncio
import secrets
import mimetypes
import os
import socket
import bcrypt
from filesystem import FileSystemError, FileSystemService, FileAlreadyExistsError
import decky
import gamerecording
import subprocess
import uuid

# Load user's settings
from shared_settings import get_server_settings_manager, get_credentials_manager
settings_credentials = get_credentials_manager()
settings_server = get_server_settings_manager()

from utils import log_exceptions 

# =========================
# Constants
# =========================

SETTINGS_DIR = Path(decky.DECKY_PLUGIN_SETTINGS_DIR)
PLUGIN_DIR = Path(decky.DECKY_PLUGIN_DIR)
BACKEND_DIR = Path(decky.DECKY_PLUGIN_DIR) / "defaults/py_modules"
WEBUI_DIR = PLUGIN_DIR / "defaults/py_modules/webui"
AUTH_COOKIE = "auth_token"
DEFAULT_PORT = 8082
DEFAULT_TIMEOUT_IN_SECONDS = 600 # 600s or 10m
PASSWORD_FIELD = "password_hash"
USERNAME_FIELD = "user_login"
BASE_DIR_FIELD = "base_dir"
PORT_FIELD = "port"
HOST_FIELD = "host"
MAX_LOGIN_ATTEMPT_FIELD = "login_attempt"
AUTH_TOKEN_FIELD = "auth_tokens"
DEFAULT_TIMEOUT_FIELD = "shutdown_timeout_seconds"

# =========================
# Exceptions
# =========================

class PortAlreadyInUseError(Exception):
    pass


# =========================
# Middleware
# =========================

@web.middleware
async def activity_middleware(request, handler):
    app = request.app
    server: "WebServer" = app["server"]

    server._active_requests += 1
    server._last_activity = asyncio.get_running_loop().time()

    try:
        return await handler(request)
    finally:
        server._active_requests -= 1
        server._last_activity = asyncio.get_running_loop().time()


@web.middleware
async def auth_middleware(request, handler):
    path = request.path

    # Allow static files
    if not path.startswith("/api"):
        return await handler(request)

    # Allow login endpoint
    if path == "/api/login":
        return await handler(request)

    token = request.cookies.get(AUTH_COOKIE)

    if not token or token not in request.app[AUTH_TOKEN_FIELD]:
        return web.json_response(
            {"error": "Not logged in"},
            status=400
        )

    return await handler(request)

# =========================
# Util methods
# =========================

# Credential
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def check_credentials():
    login = settings_credentials.getSetting(USERNAME_FIELD)
    password = settings_credentials.getSetting(PASSWORD_FIELD)
    if(login is None or login.strip() == ''):
        settings_credentials.setSetting(USERNAME_FIELD, "admin")
    if(password is None or password.strip() == ''):
        settings_credentials.setSetting(PASSWORD_FIELD, hash_password("admin"))

def reset_settings():
    settings_credentials.setSetting(USERNAME_FIELD, "admin")
    settings_credentials.setSetting(PASSWORD_FIELD, hash_password("admin"))
    settings_credentials.setSetting(MAX_LOGIN_ATTEMPT_FIELD, 0)
    settings_server.setSetting(PORT_FIELD, DEFAULT_PORT)
    settings_server.setSetting(BASE_DIR_FIELD, os.path.expanduser("~"))
    settings_server.setSetting(DEFAULT_TIMEOUT_FIELD, DEFAULT_TIMEOUT_IN_SECONDS)

# -------------------------------------------------------------------------------

def get_file_system_service() -> FileSystemService:
    fs = None
    try:
        fs = FileSystemService(get_base_dir())
    except FileSystemError as e:
        decky.logger.exception(f"The directory {get_base_dir()} doesn't exist, fallback to {os.path.expanduser('~')}")
        fs = FileSystemService(os.path.expanduser("~"))
    return fs

def check_server_settings():
    if not settings_server.getSetting(BASE_DIR_FIELD):
        settings_server.setSetting(BASE_DIR_FIELD, os.path.expanduser("~"))
    if not settings_server.getSetting(PORT_FIELD):
        settings_server.setSetting(PORT_FIELD, DEFAULT_PORT)

def get_base_dir() -> str:
    base_dir = settings_server.getSetting(BASE_DIR_FIELD)
    if not base_dir:
        base_dir = os.path.expanduser("~")
        settings_server.setSetting(BASE_DIR_FIELD, base_dir)
    return base_dir

def get_host_from_settings() -> str:
    decky.logger.info("Getting host from settings: " + str(settings_server.getSetting(PORT_FIELD) or DEFAULT_PORT))
    return settings_server.getSetting(HOST_FIELD) or "0.0.0.0"

def get_port_from_settings() -> int:
    decky.logger.info("Getting port from settings: " + str(settings_server.getSetting(PORT_FIELD) or DEFAULT_PORT))
    return settings_server.getSetting(PORT_FIELD) or DEFAULT_PORT

def get_time_to_shutdown_timeout() -> int:
    """
    Returns inactivity timeout in seconds.
    Can be changed dynamically via settings.
    """
    timeout = int(settings_server.getSetting(DEFAULT_TIMEOUT_FIELD) or 0)
    if not timeout:
        timeout = DEFAULT_TIMEOUT_IN_SECONDS
        settings_server.setSetting(DEFAULT_TIMEOUT_FIELD, timeout)
    return timeout

def get_videos_dir() -> Path:
    videos = Path.home() / "Videos"
    videos.mkdir(parents=True, exist_ok=True)
    return videos

class WebServer:
    def __init__(
        self,
        fs: FileSystemService = get_file_system_service(),
        host=get_host_from_settings(),
        port=get_port_from_settings()
    ):
        self.webui_dir = WEBUI_DIR
        self.fs = fs

        self.host = host
        self.port = port

        self.app = web.Application(middlewares=[activity_middleware, auth_middleware])
        self.app["server"] = self
        self.app[AUTH_TOKEN_FIELD] = set()

        self.runner = None
        self.site = None

        # Inactivity check
        self._last_activity = asyncio.get_running_loop().time()
        self._active_requests = 0
        self._shutdown_task: asyncio.Task | None = None

        check_credentials()
        self._setup_routes()
        self._setup_static()

    def _setup_routes(self):
        self.app.router.add_get("/", self.index)
        
        self.app.router.add_post("/api/login", self.login)
        self.app.router.add_get("/api/logoff", self.logoff)
        self.app.router.add_get("/api/login/is-logged", self.is_logged)

        self.app.router.add_get("/api/ping", self.ping)
        self.app.router.add_post("/api/dir/list", self.list_dir)
        self.app.router.add_post("/api/dir/upload", self.upload)
        self.app.router.add_post("/api/dir/download", self.download)
        self.app.router.add_post("/api/dir/delete", self.delete)
        self.app.router.add_post("/api/file/rename", self.rename)
        self.app.router.add_post("/api/dir/paste", self.paste)
        self.app.router.add_post("/api/dir/create", self.create_dir)
        self.app.router.add_get("/api/file/view", self.view_file)
        self.app.router.add_get("/api/steam/clips", self.list_steam_clips)
        self.app.router.add_post("/api/steam/clips/assemble", self.assemble_steam_clip)

    def _setup_static(self):
        self.app.router.add_static(
            "/",
            self.webui_dir,
            show_index=True
        )

    async def index(self, request):
        return web.FileResponse(self.webui_dir / "index.html")

    # --------------------
    # AUTH ENDPOINTS
    # --------------------

    @log_exceptions
    async def login(self, request: web.Request):
        try:
            data = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid or missing JSON body")

        input_login = data.get("login")
        input_password = data.get("password")

        if not input_login or not input_password:
            raise web.HTTPBadRequest(reason="Missing credentials")
        
        login_attempt = int(settings_credentials.getSetting(MAX_LOGIN_ATTEMPT_FIELD) or 0)
        if login_attempt > 10:
            decky.logger.warning(f"The account has been locked for excess of attempts. This is attempt number {login_attempt}")
            return web.json_response(
                    {"error": "The account has been locked, please change the password and try again."},
                    status=403)

        stored_login = str(settings_credentials.getSetting(USERNAME_FIELD))
        stored_password = str(settings_credentials.getSetting(PASSWORD_FIELD)) # type: ignore

        if (input_login != stored_login) or (not verify_password(input_password, stored_password)):
            settings_credentials.setSetting(MAX_LOGIN_ATTEMPT_FIELD, login_attempt + 1)
            decky.logger.warning(f"Failed attempt to login in webUI")
            raise web.HTTPUnauthorized(reason="Wrong credential")

        settings_credentials.setSetting(MAX_LOGIN_ATTEMPT_FIELD, 0)
        token = secrets.token_urlsafe(32)
        self.app[AUTH_TOKEN_FIELD].add(token)

        response = web.json_response({"status": "logged_in"})
        response.set_cookie(
            AUTH_COOKIE,
            token,
            httponly=True,
            secure=False,      
            samesite="Strict"
        )
        decky.logger.info("Successful login")
        return response

    @log_exceptions
    async def logoff(self, request):
        token = request.cookies.get(AUTH_COOKIE)

        if token:
            self.app[AUTH_TOKEN_FIELD].discard(token)

        response = web.json_response({"status": "logged_off"})
        response.del_cookie(AUTH_COOKIE)
        return response
    
    @log_exceptions
    async def is_logged(self, request):
        # If middleware let it pass, user is logged
        return web.json_response({"logged": True})

    # --------------------
    # PROTECTED ENDPOINTS - File operations
    # --------------------
    async def ping(self, request):
        return web.json_response({"status": "ok"})

    @log_exceptions
    async def list_dir(self, request):
        try:
            data = await request.json()
            path = data.get("path", get_base_dir())
        except Exception:
            path = get_base_dir()

        if not path:
            path = get_base_dir()

        try:
            selected_dir = self.fs.get_object(path)

            if not selected_dir.isDir():
                return web.json_response(
                    {"error": "Path is not a directory"},
                    status=400
                )

            items = self.fs.list_dir(path)

            return web.json_response({
                "selectedDir": selected_dir.to_dict(),
                "dirContent": [obj.to_dict() for obj in items]
            })

        except (FileSystemError, FileNotFoundError) as e:
            return web.json_response(
                {"error": str(e)},
                status=400
            )
    
    @log_exceptions
    async def delete(self, request: web.Request):
        data = await request.json()
        paths = data.get("paths", [])

        if not paths:
            raise web.HTTPBadRequest(reason="No paths provided")

        try:
            for path in paths:
                obj = self.fs.get_object(path)
                if obj.isDir():
                    self.fs.delete_dir(path)
                else:
                    self.fs.delete_file(path)

            return web.json_response({"status": "ok"})

        except FileSystemError as e:
            return web.json_response({"error": str(e)}, status=400)
    
    @log_exceptions
    async def rename(self, request: web.Request):
        data = await request.json()
        path = data.get("path")
        new_name = data.get("newName")

        if not path or not new_name:
            raise web.HTTPBadRequest(reason="Missing rename data")

        try:
            self.fs.rename(path, new_name)
            return web.json_response({"status": "ok"})
        except FileSystemError as e:
            return web.json_response({"error": str(e)}, status=400)
    
    @log_exceptions
    async def paste(self, request: web.Request):
        data = await request.json()

        mode = data.get("mode")
        target_dir = data.get("targetDir")
        paths = data.get("paths", [])
        overwrite = data.get("overwrite", False)

        if mode not in ("copy", "move"):
            raise web.HTTPBadRequest(reason="Invalid mode")

        conflicts = []

        for src in paths:
            name = Path(src).name
            dst = f"{target_dir.rstrip('/')}/{name}"

            try:
                if mode == "copy":
                    self.fs.copy(src, dst, overwrite=overwrite)
                else:
                    self.fs.move(src, dst, overwrite=overwrite)

            except FileAlreadyExistsError:
                conflicts.append(name)

        if conflicts and not overwrite:
            return web.json_response(
                {
                    "error": "conflict",
                    "files": conflicts
                },
                status=409
            )

        return web.json_response({"status": "ok"})
    
    @log_exceptions
    async def create_dir(self, request: web.Request):
        data = await request.json()
        path = data.get("path")

        if not path:
            raise web.HTTPBadRequest(reason="Missing path")

        try:
            self.fs.create_dir(path)
            return web.json_response({"status": "ok"})
        except FileSystemError as e:
            return web.json_response({"error": str(e)}, status=400)
        except FileExistsError:
            return web.json_response({"error": "Folder already exists"}, status=409)
        
    # =========================
    # PROTECTED ENDPOINTS - File streaming
    # =========================
    @log_exceptions
    async def upload(self, request: web.Request):
        if not request.content_type.startswith("multipart/"):
            raise web.HTTPUnsupportedMediaType(
                reason="Content-Type must be multipart/form-data"
            )

        reader: Union[MultipartReader, BodyPartReader] = await request.multipart()

        target_dir = None
        file_field: Union[BodyPartReader, None] = None

        if not isinstance(reader, MultipartReader):
            raise web.HTTPBadRequest(reason="Invalid multipart data")

        async for field in reader: # type: ignore
            field: aiohttp.BodyPartReader

            if field.name == "path":
                target_dir = (await field.read()).decode().strip()
            elif field.name == "file":
                file_field = field

        if not target_dir:
            raise web.HTTPBadRequest(reason="Missing upload path")

        if not file_field or not file_field.filename:
            raise web.HTTPBadRequest(reason="Missing file")

        filename = os.path.basename(file_field.filename)
        target_path = os.path.join(target_dir, filename)

        loop = asyncio.get_running_loop()

        try:
            stream = self.fs.open_write_stream(target_path)

            try:
                while True:
                    chunk = await file_field.read_chunk()
                    if not chunk:
                        break

                    # Write in executor to avoid blocking event loop
                    await loop.run_in_executor(None, stream.write, chunk)

            finally:
                await loop.run_in_executor(None, stream.close)

            return web.json_response({
                "status": "ok",
                "filename": filename
            })

        except FileAlreadyExistsError:
            return web.json_response(
                {"error": "File already exists"},
                status=400
            )

    @log_exceptions
    async def download(self, request: web.Request):
        data = await request.json()
        paths = data.get("paths")

        if not paths or not isinstance(paths, list):
            raise web.HTTPBadRequest(reason="Missing paths")

        # Single file - direct download
        if len(paths) == 1:
            obj = self.fs.get_object(paths[0])

            if obj.isFile():
                response = web.StreamResponse(
                    headers={
                        "Content-Disposition": f'attachment; filename="{obj.path.name}"'
                    }
                )
                await response.prepare(request)

                for chunk in self.fs.stream_read(paths[0]):
                    await response.write(chunk)

                await response.write_eof()
                return response

        # Multiple or directory - ZIP
        zip_buffer = self.fs.stream_zip(paths)

        response = web.Response(
            body=zip_buffer.read(),
            headers={
                "Content-Type": "application/zip",
                "Content-Disposition": 'attachment; filename="download.zip"'
            }
        )

        return response

    @log_exceptions
    async def view_file(self, request: web.Request):
        path = request.query.get("path")
        if not path:
            raise web.HTTPBadRequest(reason="Missing path")

        obj = self.fs.get_object(path)
        if not obj.isFile():
            raise web.HTTPBadRequest(reason="Not a file")

        file_path = obj.path
        file_size = file_path.stat().st_size

        mime, _ = mimetypes.guess_type(path)
        mime = mime or "application/octet-stream"

        range_header = request.headers.get("Range")

        if range_header:
            start, end = range_header.replace("bytes=", "").split("-")
            start = int(start)
            end = int(end) if end else file_size - 1

            if start >= file_size:
                raise web.HTTPRequestRangeNotSatisfiable()

            chunk_size = end - start + 1

            headers = {
                "Content-Type": mime,
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_size),
            }

            response = web.StreamResponse(status=206, headers=headers)
            try:
                await response.prepare(request)

                with open(file_path, "rb") as f:
                    f.seek(start)
                    remaining = chunk_size

                    while remaining > 0:
                        data = f.read(min(64 * 1024, remaining))
                        if not data:
                            break
                        await response.write(data)
                        remaining -= len(data)

                await response.write_eof()
            except (ClientConnectionResetError, asyncio.CancelledError):
                decky.logger.info("Client disconnected during file streaming")
            
            return response

        # ---- Fallback: no Range header ----
        headers = {
            "Content-Type": mime,
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Content-Disposition": "inline",
        }

        response = web.StreamResponse(headers=headers)
        
        try:
            await response.prepare(request)

            with open(file_path, "rb") as f:
                while chunk := f.read(64 * 1024):
                    await response.write(chunk)

            await response.write_eof()
        except (ClientConnectionResetError, asyncio.CancelledError):
            decky.logger.info("Client disconnected during fallback streaming")

        return response
    
    # =========================
    # PROTECTED ENDPOINTS - Game Recording
    # =========================
    @log_exceptions
    async def list_steam_clips(self, request: web.Request):
        clips = gamerecording.scan_steam_recordings()
        return web.json_response({
            "count": len(clips),
            "clips": clips
        })
    
    @log_exceptions
    async def assemble_steam_clip(self, request: web.Request):
        """
        Expects JSON:
        {
            "mpd": "/full/path/to/session.mpd",
            "outputName": "my_clip.mp4",   # optional
            "overwrite": false             # optional
        }
        """

        data = await request.json()

        mpd_path = data.get("mpd")
        output_name = data.get("outputName")
        overwrite = bool(data.get("overwrite", False))

        if not mpd_path:
            raise web.HTTPBadRequest(reason="Missing mpd path")

        mpd = Path(mpd_path)
        if not mpd.exists() or mpd.name != "session.mpd":
            raise web.HTTPBadRequest(reason="Invalid session.mpd path")

        videos_dir = get_videos_dir()

        # -------------------------------------------------
        # Output name handling
        # -------------------------------------------------
        if not output_name:
            output_name = f"steam_clip_{uuid.uuid4().hex[:12]}.mp4"

        output_path = videos_dir / output_name

        # -------------------------------------------------
        # Conflict handling
        # -------------------------------------------------
        if output_path.exists() and not overwrite:
            return web.json_response(
                {
                    "error": "conflict",
                    "files": [output_path.name]
                },
                status=409
            )

        loop = asyncio.get_running_loop()

        try:
            await loop.run_in_executor(
                None,
                gamerecording.assemble_dash_to_mp4,
                str(mpd),
                output_path
            )
        except subprocess.CalledProcessError:
            raise web.HTTPInternalServerError(reason="FFmpeg failed assembling clip")
        except Exception as e:
            raise web.HTTPInternalServerError(reason=str(e))

        return web.json_response({
            "status": "ok",
            "output": str(output_path),
            "overwritten": overwrite
        })


    # --------------------
    # SERVER LIFECYCLE
    # --------------------
    async def start(self):
        decky.logger.info("Starting webUI server.")
        try:
            self.runner = web.AppRunner(self.app)
            await self.runner.setup()
            self.host = get_host_from_settings()
            self.port = get_port_from_settings()
            self.site = web.TCPSite(
                self.runner,
                host=self.host,
                port=self.port
            )

            await self.site.start()

            # RESET inactivity timer ON START
            self._last_activity = asyncio.get_running_loop().time()

            if not self._shutdown_task or self._shutdown_task.done():
                self._shutdown_task = asyncio.create_task(
                    self._inactivity_watcher()
                )
        except OSError as e:
            if e.errno == 98:
                decky.logger.error(f"Port {self.port} is already in use")
                raise PortAlreadyInUseError(f"Port {self.port} is already in use")
            else:
                decky.logger.exception(f"An unknown error has occured while starting the webUI server.")
                raise

    async def stop(self):
        decky.logger.info("Stopping webUI server.")
        if self.site:
            await self.site.stop()
            self.site = None
        if self.runner:
            await self.runner.cleanup()
            self.runner = None
        if self._shutdown_task:
            self._shutdown_task.cancel()
            self._shutdown_task = None


    async def is_running(self) -> bool:
        return self.runner is not None and self.site is not None
    
    async def get_ipv4(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
        finally:
            s.close()

    async def _inactivity_watcher(self):
        loop = asyncio.get_running_loop()

        try:
            while True:
                await asyncio.sleep(5)

                timeout = get_time_to_shutdown_timeout()
                now = loop.time()

                inactive_for = now - self._last_activity

                if (inactive_for >= timeout and self._active_requests == 0):
                    decky.logger.info(f"Server inactive for {int(inactive_for)} seconds, shutting down")
                    await self.stop()
                    break
        except asyncio.CancelledError:
            pass
        except Exception:
            decky.logger.exception("Inactivity watcher crashed")

