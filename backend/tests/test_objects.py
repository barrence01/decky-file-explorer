import pytest


def test_file_object_properties(fs):
    fs.create_file("test.txt", b"content")
    obj = fs.get_object("test.txt")

    assert obj.isFile()
    assert not obj.isDir()
    assert obj.getFileName() == "test.txt"
    assert obj.getFileExtension() == ".txt"
    assert obj.getSize() == 7
    assert obj.getFileType() == "text"


def test_directory_object_properties(fs):
    fs.create_dir("docs")
    obj = fs.get_object("docs")

    assert obj.isDir()
    assert not obj.isFile()

    with pytest.raises(IsADirectoryError):
        obj.getFileName()

    with pytest.raises(IsADirectoryError):
        obj.getFileExtension()


def test_to_dict_file(fs):
    fs.create_file("a.txt", b"123")
    data = fs.get_object("a.txt").to_dict()

    assert data["isFile"] is True
    assert data["name"] == "a.txt"
    assert data["extension"] == ".txt"
    assert data["size"] == 3
    assert data["type"] == "text"


def test_to_dict_directory(fs):
    fs.create_dir("docs")
    fs.create_file("docs/a.txt", b"x")

    data = fs.get_object("docs").to_dict()

    assert data["isDir"] is True
    assert data["itemsCount"] == 1
