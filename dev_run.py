import decky
from settings import SettingsManager
import sys
from pathlib import Path

SETTINGS_DIR = Path(decky.DECKY_PLUGIN_SETTINGS_DIR)
PYTHON_SCRIPT_DIR = Path(decky.DECKY_PLUGIN_DIR)

PYTHON_MODULES_DIR = PYTHON_SCRIPT_DIR / "py_modules"
if not PYTHON_MODULES_DIR.exists():
    PYTHON_MODULES_DIR = PYTHON_SCRIPT_DIR / "defaults/py_modules"

PYTHON_BIN_DIR = PYTHON_SCRIPT_DIR / "bin"

LOG_DIR = Path(decky.DECKY_PLUGIN_LOG_DIR)

sys.path.insert(0, str(PYTHON_SCRIPT_DIR))
sys.path.insert(0, str(PYTHON_MODULES_DIR))
sys.path.insert(0, str(PYTHON_BIN_DIR))

import asyncio
from server import WebServer

settings_server = SettingsManager(name="server_settings", settings_directory=SETTINGS_DIR)
settings_server.read()

async def main():
    web_server = WebServer()

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
