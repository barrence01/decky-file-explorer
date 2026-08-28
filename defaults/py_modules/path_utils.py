from pathlib import Path
import os


def normalize_api_path(path: Path | str) -> str:
    return str(path).replace("\\", "/")


def join_api_path(parent: str, name: str) -> str:
    if not name or name in (".", ".."):
        raise ValueError("Invalid name")
    if "/" in name or "\\" in name:
        raise ValueError("Invalid name")
    return normalize_api_path(Path(parent) / name)


def is_path_accessible(path: Path, base_dir: Path) -> bool:
    p = path.resolve()

    if os.name == "nt":
        from filesystem import is_path_on_c_drive

        if is_path_on_c_drive(p) and not p.is_relative_to(base_dir):
            return False
    else:
        from filesystem import is_path_on_linux_root_and_not_external_or_not_user_space

        if is_path_on_linux_root_and_not_external_or_not_user_space(p, base_dir):
            return False

    return True


def get_parent_path(resolved: Path, base_dir: Path) -> str | None:
    current = resolved.resolve()
    base = base_dir.resolve()

    if current == base:
        return None

    parent = current.parent
    if parent == current:
        return None
    if not is_path_accessible(parent, base):
        return None
    return normalize_api_path(parent)


def can_navigate_up(resolved: Path, base_dir: Path) -> bool:
    return get_parent_path(resolved, base_dir) is not None


def build_breadcrumbs(resolved: Path, base_dir: Path) -> list[dict]:
    segments: list[dict] = []
    current = resolved.resolve()
    base = base_dir.resolve()

    while True:
        if not is_path_accessible(current, base):
            break

        name = current.name or normalize_api_path(current)
        segments.append({
            "name": name,
            "path": normalize_api_path(current),
        })

        if current == base:
            break

        if current.parent == current:
            break

        parent = current.parent
        if not is_path_accessible(parent, base):
            break

        current = parent

    segments.reverse()
    return segments
