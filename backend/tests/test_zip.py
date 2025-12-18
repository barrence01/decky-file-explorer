import zipfile


def test_stream_zip_single_file(fs):
    fs.create_file("a.txt", b"zipme")

    buffer = fs.stream_zip(["a.txt"])

    with zipfile.ZipFile(buffer) as z:
        assert z.namelist() == ["a.txt"]
        assert z.read("a.txt") == b"zipme"


def test_stream_zip_directory(fs):
    fs.create_dir("docs")
    fs.create_file("docs/a.txt", b"A")
    fs.create_file("docs/b.txt", b"B")

    buffer = fs.stream_zip(["docs"])

    with zipfile.ZipFile(buffer) as z:
        names = set(z.namelist())
        assert names == {"docs/a.txt", "docs/b.txt"}
