import pytest
from aiohttp import web, FormData
from filesystem import FileSystemService
from filesystem import download, upload

@pytest.mark.asyncio
async def test_download_handler(aiohttp_client, tmp_path):
    fs = FileSystemService(tmp_path)
    fs.create_file("file.txt", b"downloaded")

    app = web.Application()
    app["fs"] = fs
    app.router.add_get("/download", download)

    client = await aiohttp_client(app)
    resp = await client.get("/download", params={"path": "file.txt"})

    assert resp.status == 200
    assert "attachment" in resp.headers["Content-Disposition"]
    assert await resp.read() == b"downloaded"


@pytest.mark.asyncio
async def test_upload_handler(aiohttp_client, tmp_path):
    fs = FileSystemService(tmp_path)

    app = web.Application()
    app["fs"] = fs
    app.router.add_post("/upload", upload)

    client = await aiohttp_client(app)

    data = FormData()
    data.add_field(
        "file",
        b"uploaded content",
        filename="upload.txt",
        content_type="text/plain",
    )

    resp = await client.post("/upload", data=data)

    assert resp.status == 200
    uploaded = tmp_path / "uploads" / "upload.txt"
    assert uploaded.exists()
    assert uploaded.read_bytes() == b"uploaded content"
