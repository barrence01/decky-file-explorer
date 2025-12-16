import decky
from settings import SettingsManager

from backend.server import WebServer

from backend.filesystem import (
    FileSystemService
)

from pathlib import Path

SETTINGS_DIR = decky.DECKY_PLUGIN_SETTINGS_DIR
SCRIPT_DIR = decky.DECKY_PLUGIN_DIR
LOG_DIR = decky.DECKY_PLUGIN_LOG_DIR

# Load user's settings
settings = SettingsManager(name="settings", settings_directory=SETTINGS_DIR)
settings.read()

fs = FileSystemService(Path("/home/deck"))


class Plugin:
    async def _main(self):
        decky.logger.info("Starting web server...")
        base_dir = Path(decky.DECKY_PLUGIN_DIR)

        self.web_server = WebServer(
            base_dir=base_dir,
            port=8082
        )

        await self.web_server.start()
        decky.logger.info("Web server started")

    async def _unload(self):
        if hasattr(self, "web_server"):
            decky.logger.info("Stopping web server...")
            await self.web_server.stop()

