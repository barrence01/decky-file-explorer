import asyncio
from pathlib import Path
import os

from backend.server import WebServer
from backend.filesystem import FileSystemService
import decky
from settings import SettingsManager

SETTINGS_DIR = Path(decky.DECKY_PLUGIN_SETTINGS_DIR)
settings_server = SettingsManager(name="server_settings", settings_directory=SETTINGS_DIR)
settings_server.read()

DIR_PATH = Path(decky.DECKY_PLUGIN_DIR)

async def main():
    web_server = WebServer(
        base_dir=Path(DIR_PATH / "backend"),
        host="0.0.0.0",
        port=8082
    )

    await web_server.start()

    decky.logger.info(f"Server running at http://localhost:{web_server.port}/api/ping")
    decky.logger.info(f"Also accessible via http://<deck-ip>:{web_server.port}")

    try:
        while True:
            await asyncio.sleep(3600)
    except KeyboardInterrupt:
        decky.logger.info("Shutting down server...")
    finally:
        await web_server.stop()


if __name__ == "__main__":
    asyncio.run(main())
