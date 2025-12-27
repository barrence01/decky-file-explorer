from pathlib import Path
from typing import List
import shutil
import mimetypes
from aiohttp import web
import zipfile
import io
import os, subprocess, json

DEFAULT_CHUNK_SIZE = 64 * 1024  # 64 KB


# =========================
# Exceptions
# =========================

class FileSystemError(Exception):
    pass

class FileAlreadyExistsError(Exception):
    pass

# =========================
# Utils
# =========================

def is_path_on_c_root(path: Path) -> bool:
    p = path.resolve()
    return p.drive.upper() == "C:" and p.parent == p

def is_path_on_c_drive(path: Path) -> bool:
    p = path.resolve()
    return p.drive.upper() == "C:"

# ----- LINUX ----- 
def get_external_drives():
    result = subprocess.run(
        ["lsblk", "-J", "-o", "NAME,TYPE,RM,SIZE,MOUNTPOINT,FSTYPE,TRAN"],
        capture_output=True,
        text=True,
        check=True
    )
    data = json.loads(result.stdout)
    return data["blockdevices"]

def _walk_blockdevices(devices):
    """Flatten lsblk tree"""
    for dev in devices:
        yield dev
        for child in dev.get("children", []):
            yield from _walk_blockdevices([child])

def get_external_mountpoints() -> set[Path]:
    mounts = set()

    for dev in _walk_blockdevices(get_external_drives()):
        mount = dev.get("mountpoint")
        if not mount:
            continue

        if dev.get("rm") or dev.get("tran") in ("usb", "mmc"):
            mounts.add(Path(mount))

    return mounts

def is_path_on_linux_root_and_not_external_or_not_user_space(path: Path, base_dir:Path) -> bool:

    is_external = False

    is_user_space = False

    allowed_mount_roots = (
        Path("/mnt"),
        Path("/media"),
        Path("/var/media"),
        Path("/var/mnt")
    )

    external_mounts = get_external_mountpoints()

    if any(path.is_relative_to(m) for m in allowed_mount_roots) or any(path.is_relative_to(m) for m in external_mounts):
        is_external = True

    if path.is_relative_to(base_dir or Path(os.path.expanduser("~"))):
        is_user_space = True
    
    return not (is_external or is_user_space)

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
    
    def isHidden(self) -> bool:
        return self.path.name.startswith(".")
    
    # def isProtected(self) -> bool:
    #     try:
    #         self.path.stat()

    #         if self.isDir():
    #             os.listdir(self.path)
    #         else:
    #             with open(self.path, "rb"):
    #                 pass

    #         return False
    #     except (PermissionError, OSError):
    #         return True

    # ---- Directory / file info ----
    def getDirectoryPath(self) -> str:
        return str(self.path if self.isDir() else self.path.parent)
    
    def getItemsCount(self) -> int:
        if not self.isDir():
            raise NotADirectoryError("This object is not a directory")
        try:
            return sum(1 for _ in self.path.iterdir())
        except PermissionError:
            return 0

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
            "isHidden": self.isHidden(),
            #"isProtected": self.isProtected(),
            "directory": self.getDirectoryPath(),
        }

        if self.isDir():
            data.update({
                "itemsCount": self.getItemsCount()
            })

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
        
    def _resolve(self, user_path: str) -> Path:
        if not user_path:
            raise FileSystemError("Path is required")
        
        # Reject ~ explicitly (no expanduser semantics)
        if user_path.startswith("~"):
            raise FileSystemError("Home expansion is not allowed")

        raw = Path(user_path)

        # If absolute, use it as-is
        if raw.is_absolute():
            p = raw.resolve()
        else:
            # Relative paths are always relative to base_dir
            p = (self.base_dir / raw).resolve()

        # ============================
        # WINDOWS
        # ============================
        if os.name == "ntt":
            if is_path_on_c_drive(p) and not p.is_relative_to(self.base_dir):
                raise FileSystemError("Access to main drive (C:) is forbidden")
            
        # ============================
        # LINUX / UNIX
        # ============================
        else:
            if is_path_on_linux_root_and_not_external_or_not_user_space(p, self.base_dir):
                raise FileSystemError("Access to root filesystem is forbidden")         
            
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

    def move(self, src: str, dst: str, overwrite: bool = False):
        src_path = self._resolve(src)
        dst_path = self._resolve(dst)

        if dst_path.exists() and not overwrite:
            raise FileAlreadyExistsError(f"{dst_path.name} already exists")

        if dst_path.exists() and overwrite:
            if dst_path.is_dir():
                shutil.rmtree(dst_path)
            else:
                dst_path.unlink()

        shutil.move(src_path, dst_path)

    def copy(self, src: str, dst: str, overwrite: bool = False):
        src_path = self._resolve(src)
        dst_path = self._resolve(dst)
    
        if dst_path.exists() and not overwrite:
            raise FileAlreadyExistsError(f"{dst_path.name} already exists")

        if src_path.is_dir():
            if dst_path.exists() and overwrite:
                shutil.rmtree(dst_path)
            shutil.copytree(src_path, dst_path)
        else:
            dst_path.parent.mkdir(parents=True, exist_ok=True)
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
        if Path(file_path).is_file():
            raise FileAlreadyExistsError("File already exists")
        file_path.parent.mkdir(parents=True, exist_ok=True)
        return FileWriteStream(open(file_path, "wb"))

    def copy_streamed(self, src: str, dst: str, chunk_size=DEFAULT_CHUNK_SIZE):
        src_path = self._resolve(src)
        dst_path = self._resolve(dst)
        dst_path.parent.mkdir(parents=True, exist_ok=True)

        with open(src_path, "rb") as r, open(dst_path, "wb") as w:
            while chunk := r.read(chunk_size):
                w.write(chunk)

    def stream_zip(self, paths: list[str]):
        """
        Streams a zip containing the given files/directories.
        """
        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            for p in paths:
                resolved = self._resolve(p)

                if resolved.is_file():
                    zipf.write(resolved, resolved.name)

                elif resolved.is_dir():
                    for file in resolved.rglob("*"):
                        if file.is_file():
                            arcname = file.relative_to(resolved.parent)
                            zipf.write(file, arcname)

        buffer.seek(0)
        return buffer


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

    stream = fs.open_write_stream(f"uploads/{field.filename}") # type: ignore

    try:
        while chunk := await field.read_chunk(): # type: ignore
            stream.write(chunk)
    finally:
        stream.close()

    return web.json_response({"status": "ok"})