import asyncio
from pathlib import Path
import os

from backend.server import WebServer
from backend.filesystem import FileSystemService
import decky
from settings import SettingsManager

SETTINGS_DIR = decky.DECKY_PLUGIN_SETTINGS_DIR
settings_server = SettingsManager(name="server_settings", settings_directory=SETTINGS_DIR)
settings_server.read()

DIR_PATH = "/home/deck/Documents/Programacao/Steam Deck/decky-file-explorer/"

async def main():
    # --- Filesystem test ---
    fs = FileSystemService(settings_server.getSetting("base-dir") or os.path.expanduser("~"))
    items = fs.list_dir("/home/deck/Documents")

    for obj in items:
        print(obj.to_dict())

    # --- Web server ---
    base_dir = Path(DIR_PATH + "/backend")

    web_server = WebServer(
        base_dir=base_dir,
        host="0.0.0.0",
        port=8082
    )

    await web_server.start()

    print(f"Server running at http://localhost:{web_server.port}/api/ping")
    print(f"Also accessible via http://<deck-ip>:{web_server.port}")

    try:
        while True:
            await asyncio.sleep(3600)
    except KeyboardInterrupt:
        print("Shutting down server...")
    finally:
        await web_server.stop()


if __name__ == "__main__":
    asyncio.run(main())
