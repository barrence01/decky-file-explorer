from aiohttp import web
from pathlib import Path
import asyncio

from backend.filesystem import FileSystemError, FileSystemService

BASE_DIR = Path(__file__).parent
WEBUI_DIR = BASE_DIR / "backend/webui"

def setup_static(app):
    app.router.add_static("/", WEBUI_DIR, show_index=True)

class WebServer:
    def __init__(self, base_dir: Path, fs: FileSystemService = FileSystemService(Path("/home/deck")), host="0.0.0.0", port=8082):
        self.base_dir = base_dir
        self.webui_dir = base_dir / "webui"
        self.fs = fs 

        self.host = host
        self.port = port

        self.app = web.Application()
        self.runner = None
        self.site = None

        self._setup_routes()
        self._setup_static()

    def _setup_routes(self):
        self.app.router.add_get("/api/ping", self.ping)
        self.app.router.add_get("/api/list", self.list_dir)

    def _setup_static(self):
        self.app.router.add_static(
            "/",
            self.webui_dir,
            show_index=True
        )

    async def ping(self, request):
        return web.json_response({"status": "ok"})
    
    async def list_dir(self, request):
        path = request.query.get("path", "/")

        try:
            items = self.fs.list_dir(path)
            return web.json_response({
                "path": path,
                "items": [obj.to_dict() for obj in items]
            })
        except FileSystemError as e:
            return web.json_response(
                {"error": str(e)},
                status=400
            )

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