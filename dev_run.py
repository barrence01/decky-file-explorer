import asyncio
from pathlib import Path
import os

from backend.server import WebServer
from backend.filesystem import FileSystemService

DIR_PATH = "/home/deck/Documents/Programacao/Steam Deck/decky-file-explorer/"

async def main():
    # --- Filesystem test ---
    fs = FileSystemService(os.path.expanduser("~"))
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

    print("Server running at http://localhost:8082/api/ping")
    print("Also accessible via http://<deck-ip>:8082")

    try:
        while True:
            await asyncio.sleep(3600)
    except KeyboardInterrupt:
        print("Shutting down server...")
    finally:
        await web_server.stop()


if __name__ == "__main__":
    asyncio.run(main())
