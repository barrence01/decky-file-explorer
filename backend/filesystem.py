from pathlib import Path
from typing import List
import shutil
import mimetypes
from aiohttp import web

DEFAULT_CHUNK_SIZE = 64 * 1024  # 64 KB


# =========================
# Exceptions
# =========================

class FileSystemError(Exception):
    pass


# =========================
# File System Object
# =========================

class FileSystemObject:
    def __init__(self, path: Path):
        self.path = path.resolve()

    # ---- Type checks ----
    def isDir(self) -> bool:
        return self.path.is_dir()

    def isFile(self) -> bool:
        return self.path.is_file()

    # ---- Directory / file info ----
    def getDirectoryPath(self) -> str:
        return str(self.path if self.isDir() else self.path.parent)

    def getFileName(self) -> str:
        if not self.isFile():
            raise IsADirectoryError("This object is a directory")
        return self.path.name

    def getFileExtension(self) -> str:
        if not self.isFile():
            raise IsADirectoryError("This object is a directory")
        return self.path.suffix.lower()

    def getSize(self) -> int:
        if self.isFile():
            return self.path.stat().st_size
        return 0

    def getFileType(self) -> str:
        if not self.isFile():
            raise IsADirectoryError("Directories do not have a file type")

        mime, _ = mimetypes.guess_type(self.path)
        if not mime:
            return "unknown"

        return mime.split("/")[0] 

    def to_dict(self) -> dict:
        data = {
            "path": str(self.path),
            "isDir": self.isDir(),
            "isFile": self.isFile(),
            "directory": self.getDirectoryPath(),
        }

        if self.isFile():
            data.update({
                "name": self.getFileName(),
                "extension": self.getFileExtension(),
                "size": self.getSize(),
                "type": self.getFileType(),
            })

        return data


# =========================
# Write Stream Wrapper
# =========================

class FileWriteStream:
    def __init__(self, file):
        self._file = file

    def write(self, data: bytes):
        self._file.write(data)

    def close(self):
        self._file.close()


# =========================
# File System Service
# =========================

class FileSystemService:
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir).resolve()

        if not self.base_dir.exists():
            raise FileSystemError("Base directory does not exist")

    # ---- Path safety ----
    def _resolve(self, user_path: str) -> Path:
        p = (self.base_dir / user_path.lstrip("/")).resolve()

        if not p.is_relative_to(self.base_dir):
            raise FileSystemError("Access outside base directory is forbidden")

        return p

    # ---- Directory operations ----
    def list_dir(self, path: str = "") -> List[FileSystemObject]:
        directory = self._resolve(path)

        if not directory.exists() or not directory.is_dir():
            raise FileNotFoundError("Directory not found")

        return [FileSystemObject(p) for p in directory.iterdir()]

    def create_dir(self, path: str):
        directory = self._resolve(path)
        directory.mkdir(parents=True, exist_ok=False)

    def delete_dir(self, path: str):
        directory = self._resolve(path)
        shutil.rmtree(directory)

    # ---- File operations ----
    def create_file(self, path: str, content: bytes = b""):
        file_path = self._resolve(path)
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(file_path, "wb") as f:
            f.write(content)

    def delete_file(self, path: str):
        file_path = self._resolve(path)

        if not file_path.is_file():
            raise FileNotFoundError("File not found")

        file_path.unlink()

    def move(self, src: str, dst: str):
        shutil.move(self._resolve(src), self._resolve(dst))

    def copy(self, src: str, dst: str):
        src_path = self._resolve(src)
        dst_path = self._resolve(dst)

        if src_path.is_dir():
            shutil.copytree(src_path, dst_path)
        else:
            shutil.copy2(src_path, dst_path)

    def rename(self, path: str, new_name: str):
        src = self._resolve(path)
        dst = src.parent / new_name
        src.rename(dst)

    # ---- Info ----
    def get_object(self, path: str) -> FileSystemObject:
        p = self._resolve(path)

        if not p.exists():
            raise FileNotFoundError("Path does not exist")

        return FileSystemObject(p)

    # ---- Streaming ----
    def stream_read(self, path: str, chunk_size: int = DEFAULT_CHUNK_SIZE):
        """
        Yields file content chunk by chunk (bytes).
        """
        file_path = self._resolve(path)

        if not file_path.is_file():
            raise FileNotFoundError("File not found")

        with open(file_path, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                yield chunk

    def open_write_stream(self, path: str) -> FileWriteStream:
        """
        Opens a file for streamed writing.
        Returns a writable file object.
        """
        file_path = self._resolve(path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        return FileWriteStream(open(file_path, "wb"))

    def copy_streamed(self, src: str, dst: str, chunk_size=DEFAULT_CHUNK_SIZE):
        src_path = self._resolve(src)
        dst_path = self._resolve(dst)
        dst_path.parent.mkdir(parents=True, exist_ok=True)

        with open(src_path, "rb") as r, open(dst_path, "wb") as w:
            while chunk := r.read(chunk_size):
                w.write(chunk)


# =========================
# aiohttp Handlers
# =========================

async def download(request: web.Request):
    fs: FileSystemService = request.app["fs"]
    path = request.query["path"]

    response = web.StreamResponse(
        headers={
            "Content-Disposition": f'attachment; filename="{Path(path).name}"'
        }
    )

    await response.prepare(request)

    for chunk in fs.stream_read(path):
        await response.write(chunk)

    await response.write_eof()
    return response

async def upload(request: web.Request):
    fs: FileSystemService = request.app["fs"]
    reader = await request.multipart()
    field = await reader.next()

    stream = fs.open_write_stream(f"uploads/{field.filename}")

    try:
        while chunk := await field.read_chunk():
            stream.write(chunk)
    finally:
        stream.close()

    return web.json_response({"status": "ok"})