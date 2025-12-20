import pytest
from filesystem import FileAlreadyExistsError

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
