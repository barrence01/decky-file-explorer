def test_list_empty_directory(fs):
    assert fs.list_dir(".") == []


def test_list_directory_with_files(fs):
    base = fs.base_dir
    (base / "file.txt").write_text("hello")
    (base / "dir").mkdir()

    items = fs.list_dir(".")
    names = {item.path.name for item in items}

    assert names == {"file.txt", "dir"}


def test_create_and_delete_directory(fs):
    fs.create_dir("docs")
    assert (fs.base_dir / "docs").is_dir()

    fs.delete_dir("docs")
    assert not (fs.base_dir / "docs").exists()
