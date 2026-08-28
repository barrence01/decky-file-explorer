from pathlib import Path
import os


def normalize_api_path(path: Path | str) -> str:
    return str(path).replace("\\", "/")


def validate_path_segment(name: str) -> str:
    if not name or name in (".", ".."):
        raise ValueError("Invalid name")
    if "/" in name or "\\" in name:
        raise ValueError("Invalid name")
    if any(ord(char) < 32 for char in name):
        raise ValueError("Invalid name")
    return name


def join_api_path(parent: str, name: str) -> str:
    validate_path_segment(name)
    return normalize_api_path(Path(parent) / name)


def generate_unique_filename(parent: str, filename: str, exists: callable) -> str:
    """
    Returns a unique filename within parent by appending (1), (2), etc.
    exists(relative_path: str) -> bool checks whether the candidate already exists.
    """
    validate_path_segment(filename)
    path = Path(filename)
    stem = path.stem
    suffix = path.suffix
    candidate = filename
    counter = 1

    while exists(join_api_path(parent, candidate)):
        candidate = f"{stem} ({counter}){suffix}"
        counter += 1
        validate_path_segment(candidate)

    return candidate


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


def resolve_destination(parent: Path, name: str, base_dir: Path) -> Path:
    validate_path_segment(name)
    destination = (parent / name).resolve()
    if not is_path_accessible(destination, base_dir):
        raise ValueError("Destination path is not accessible")
    return destination


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


def build_error_context(path: Path | str, base_dir: Path) -> dict:
    resolved = Path(path).resolve()
    parent_path = get_parent_path(resolved, base_dir)
    return {
        "parentPath": parent_path,
        "canNavigateUp": parent_path is not None,
    }


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
