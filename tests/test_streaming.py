import pytest
import pytest_asyncio
from concurrent.futures import ThreadPoolExecutor

from filesystem import FileAlreadyExistsError, iter_file_chunks, read_file_chunk

def test_stream_read_and_write(fs):
    data = b"x" * (1024 * 1024)
    fs.create_file("big.bin", data)

    collected = b"".join(fs.stream_read("big.bin"))
    assert collected == data


def test_stream_read_chunk_size(fs):
    data = b"A" * 100
    fs.create_file("file.bin", data)

    chunks = list(fs.stream_read("file.bin", chunk_size=10))

    assert len(chunks) == 10
    assert all(len(c) == 10 for c in chunks)


def test_open_write_stream(fs):
    stream = fs.open_write_stream("streamed.bin")

    try:
        stream.write(b"hello ")
        stream.write(b"world")
    finally:
        stream.close()

    assert (fs.base_dir / "streamed.bin").read_bytes() == b"hello world"


def test_copy_streamed(fs):
    data = b"A" * 512_000
    fs.create_file("src.bin", data)

    fs.copy_streamed("src.bin", "dst.bin")

    assert (fs.base_dir / "dst.bin").read_bytes() == data


def test_stream_read_non_file(fs):
    fs.create_dir("dir")

    with pytest.raises(FileNotFoundError):
        list(fs.stream_read("dir"))


@pytest.mark.asyncio
async def test_read_file_chunk(fs):
    data = b"0123456789"
    fs.create_file("file.bin", data)

    assert read_file_chunk(fs.base_dir / "file.bin", 2, 4) == b"2345"


@pytest.mark.asyncio
async def test_iter_file_chunks(fs):
    data = b"A" * 100
    fs.create_file("file.bin", data)
    executor = ThreadPoolExecutor(max_workers=1)

    try:
        chunks = [
            chunk
            async for chunk in iter_file_chunks(
                fs.base_dir / "file.bin",
                executor,
                chunk_size=10,
            )
        ]
    finally:
        executor.shutdown(wait=False)

    assert len(chunks) == 10
    assert b"".join(chunks) == data

