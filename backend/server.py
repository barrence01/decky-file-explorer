from aiohttp import ClientConnectionResetError, web
from pathlib import Path
import asyncio
import secrets
import hashlib
import hmac
import mimetypes
import os
import socket

from backend.filesystem import FileSystemError, FileSystemService, FileAlreadyExistsError

import decky
from settings import SettingsManager

SETTINGS_DIR = Path(decky.DECKY_PLUGIN_SETTINGS_DIR)
PLUGIN_DIR = Path(decky.DECKY_PLUGIN_DIR)
WEBUI_DIR = PLUGIN_DIR / "backend/webui"
AUTH_COOKIE = "auth_token"

# Load user's settings
settings_credentials = SettingsManager(name="credentials", settings_directory=SETTINGS_DIR)
settings_credentials.read()

settings_server = SettingsManager(name="server_settings", settings_directory=SETTINGS_DIR)
settings_server.read()

HOME_DECK_DIR = settings_server.getSetting("base_dir") or os.path.expanduser("~")

# =========================
# Exceptions
# =========================

class PortAlreadyInUseError(Exception):
    pass


# =========================
# Support methods
# =========================

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

    if not token or token not in request.app["auth_tokens"]:
        return web.json_response(
            {"error": "Not logged in"},
            status=400
        )

    return await handler(request)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def check_credentials():
    login = settings_credentials.getSetting("user_login")
    password = settings_credentials.getSetting("password_hash")
    if(login is None or login.strip() == ''):
        settings_credentials.setSetting("user_login", "admin")
    if(password is None or password.strip() == ''):
        settings_credentials.setSetting("password_hash", hash_password("admin"))

class WebServer:
    def __init__(
        self,
        base_dir: Path,
        fs: FileSystemService = FileSystemService(settings_server.getSetting("base_dir") or os.path.expanduser("~")),
        host="0.0.0.0",
        port=settings_server.getSetting("port") or 8082
    ):
        self.base_dir = base_dir or PLUGIN_DIR
        self.webui_dir = WEBUI_DIR
        self.fs = fs

        self.host = host
        self.port = port

        self.app = web.Application(middlewares=[auth_middleware])
        self.app["auth_tokens"] = set()

        self.runner = None
        self.site = None

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

    async def login(self, request: web.Request):
        try:
            data = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid or missing JSON body")

        input_login = data.get("login")
        input_password = data.get("password")

        if not input_login or not input_password:
            raise web.HTTPBadRequest(reason="Missing credentials")

        stored_login = settings_credentials.getSetting("user_login")
        stored_password_hash = settings_credentials.getSetting("password_hash")

        input_password_hash = hash_password(input_password)

        if input_login != stored_login or not hmac.compare_digest(
            input_password_hash, stored_password_hash
        ):
            raise web.HTTPUnauthorized(reason="Wrong credential")

        token = secrets.token_urlsafe(32)
        self.app["auth_tokens"].add(token)

        response = web.json_response({"status": "logged_in"})
        response.set_cookie(
            AUTH_COOKIE,
            token,
            httponly=True,
            secure=False,      
            samesite="Strict"
        )
        return response

    async def logoff(self, request):
        token = request.cookies.get(AUTH_COOKIE)

        if token:
            self.app["auth_tokens"].discard(token)

        response = web.json_response({"status": "logged_off"})
        response.del_cookie(AUTH_COOKIE)
        return response
    
    async def is_logged(self, request):
        # If middleware let it pass, user is logged
        return web.json_response({"logged": True})

    # --------------------
    # PROTECTED ENDPOINTS
    # --------------------

    async def ping(self, request):
        return web.json_response({"status": "ok"})

    async def list_dir(self, request):
        try:
            data = await request.json()
            path = data.get("path", HOME_DECK_DIR)
        except Exception:
            path = HOME_DECK_DIR

        if not path:
            path = HOME_DECK_DIR

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

    async def upload(self, request: web.Request):
        reader = await request.multipart()

        field = await reader.next()
        if field.name != "path":
            raise web.HTTPBadRequest(reason="Missing upload path")

        target_dir = (await field.read()).decode()

        field = await reader.next()
        if not field or not field.filename:
            raise web.HTTPBadRequest(reason="Missing file")

        target_path = f"{target_dir.rstrip('/')}/{field.filename}"

        try:
            stream = self.fs.open_write_stream(target_path)

            try:
                while chunk := await field.read_chunk():
                    stream.write(chunk)
            finally:
                stream.close()

            return web.json_response({"status": "ok"})

        except FileAlreadyExistsError:
            return web.json_response(
                {"error": "File already exists"},
                status=400
            )

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
                decky.logger.debug("Client disconnected during file streaming")
            
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
            decky.logger.debug("Client disconnected during fallback streaming")

        return response


    # --------------------
    # SERVER LIFECYCLE
    # --------------------

    async def start(self):
        decky.logger.info("Starting webUI server.")
        try:
            self.runner = web.AppRunner(self.app)
            await self.runner.setup()

            self.site = web.TCPSite(
                self.runner,
                host=self.host,
                port=self.port
            )
            await self.site.start()
        except OSError as e:
            if e.errno == 98:
                decky.logger.error(f"Port {self.port} is already in use")
                raise PortAlreadyInUseError(f"Port {self.port} is already in use")
            else:
                decky.logger.error(f"An unknown error has occured while starting the webUI server.", e)
                raise

    async def stop(self):
        decky.logger.info("Stopping webUI server.")
        if self.site:
            await self.site.stop()
        if self.runner:
            await self.runner.cleanup()

    async def is_running(self) -> bool:
        return self.runner and self.site
    
    async def get_ipv4():
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
        finally:
            s.close()
