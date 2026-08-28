import os
from pathlib import Path

import pytest

from path_utils import (
    build_breadcrumbs,
    build_error_context,
    can_navigate_up,
    get_parent_path,
    join_api_path,
    normalize_api_path,
    validate_path_segment,
)


def test_normalize_api_path_posix():
    assert normalize_api_path("/home/deck/Documents") == "/home/deck/Documents"


def test_normalize_api_path_windows_style():
    assert normalize_api_path("C:\\Users\\deck\\Documents") == "C:/Users/deck/Documents"


def test_join_api_path():
    assert join_api_path("/home/deck", "Documents") == "/home/deck/Documents"


def test_join_api_path_rejects_invalid_name():
    with pytest.raises(ValueError):
        join_api_path("/home/deck", "../secret")

    with pytest.raises(ValueError):
        join_api_path("/home/deck", "folder/name")


def test_validate_path_segment_accepts_valid_name():
    assert validate_path_segment("Documents") == "Documents"


def test_validate_path_segment_rejects_control_chars():
    with pytest.raises(ValueError):
        validate_path_segment("bad\x01name")


def test_build_error_context(tmp_path: Path):
    child = tmp_path / "docs"
    child.mkdir()

    context = build_error_context(child.resolve(), tmp_path.resolve())

    assert context["parentPath"] == normalize_api_path(tmp_path)
    assert context["canNavigateUp"] is True


def test_get_parent_path_nested(tmp_path: Path):
    child = tmp_path / "docs" / "projects"
    child.mkdir(parents=True)

    parent = get_parent_path(child.resolve(), tmp_path.resolve())
    assert parent == normalize_api_path(tmp_path / "docs")


def test_get_parent_path_at_base_dir(tmp_path: Path):
    parent = get_parent_path(tmp_path.resolve(), tmp_path.resolve())
    assert parent is None


def test_can_navigate_up_nested(tmp_path: Path):
    child = tmp_path / "docs"
    child.mkdir()

    assert can_navigate_up(child.resolve(), tmp_path.resolve()) is True


def test_can_navigate_up_at_base_dir(tmp_path: Path):
    assert can_navigate_up(tmp_path.resolve(), tmp_path.resolve()) is False


def test_build_breadcrumbs(tmp_path: Path):
    leaf = tmp_path / "docs" / "projects"
    leaf.mkdir(parents=True)

    breadcrumbs = build_breadcrumbs(leaf.resolve(), tmp_path.resolve())

    assert len(breadcrumbs) == 3
    assert breadcrumbs[0]["path"] == normalize_api_path(tmp_path)
    assert breadcrumbs[-1]["path"] == normalize_api_path(leaf)
    assert breadcrumbs[-1]["name"] == "projects"


def test_normalize_api_path_windows_drive():
    assert normalize_api_path("D:\\Steam\\clips") == "D:/Steam/clips"


def test_join_api_path_normalizes_slashes():
    assert join_api_path("C:/Users/deck", "Videos") == "C:/Users/deck/Videos"
