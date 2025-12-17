from aiohttp import web
from pathlib import Path
import asyncio
import secrets
import hashlib
import hmac

from backend.filesystem import FileSystemError, FileSystemService, FileAlreadyExistsError

import decky
from settings import SettingsManager

SETTINGS_DIR = decky.DECKY_PLUGIN_SETTINGS_DIR
BASE_DIR = Path(__file__).parent
WEBUI_DIR = BASE_DIR / "backend/webui"
HOME_DECK_DIR = "/home/deck"

AUTH_COOKIE = "auth_token"

# Load user's settings
settings = SettingsManager(name="credentials", settings_directory=SETTINGS_DIR)
settings.read()


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
    login = settings.getSetting("userLogin")
    password = settings.getSetting("password")
    if(login is None or login.strip() == ''):
        settings.setSetting("userLogin", "admin")
    if(password is None or password.strip() == ''):
        settings.setSetting("password_hash", hash_password("admin"))

class WebServer:
    def __init__(
        self,
        base_dir: Path,
        fs: FileSystemService = FileSystemService(Path("/home/deck")),
        host="0.0.0.0",
        port=8082
    ):
        self.base_dir = base_dir
        self.webui_dir = base_dir / "webui"
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

        stored_login = settings.getSetting("userLogin")
        stored_password_hash = settings.getSetting("password_hash")

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
            secure=True,      # ⚠ requires HTTPS
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


    # --------------------
    # SERVER LIFECYCLE
    # --------------------

    async def start(self):
        self.runner = web.AppRunner(self.app)
        await self.runner.setup()

        self.site = web.TCPSite(
            self.runner,
            host=self.host,
            port=self.port
        )
        await self.site.start()

    async def stop(self):
        if self.site:
            await self.site.stop()
        if self.runner:
            await self.runner.cleanup()
