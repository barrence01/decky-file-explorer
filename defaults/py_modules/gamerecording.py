from pathlib import Path
import subprocess
import shutil
import os
import decky

STEAM_USERDATA_DIR = Path.home() / ".local/share/Steam/userdata"

def get_steam_dir() -> str:
    import winreg
    registry_paths = [
        r"SOFTWARE\WOW6432Node\Valve\Steam",  # 64-bit Windows
        r"SOFTWARE\Valve\Steam"               # 32-bit Windows
    ]

    for reg_path in registry_paths:
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, reg_path) as key:
                return winreg.QueryValueEx(key, "InstallPath")[0]
        except FileNotFoundError:
            pass

    return ""

def convert_dash_folder_to_mp4(video_dir: str | Path, output_file: str | Path):
    video_dir = Path(video_dir)
    output_file = Path(output_file)

    mpd = video_dir / "session.mpd"
    if not mpd.exists():
        raise FileNotFoundError("session.mpd not found")

    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg not found in PATH")

    output_file.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel", "error",
        "-i", str(mpd),
        "-c", "copy",
        str(output_file),
    ]

    subprocess.run(cmd, check=True)

def scan_steam_recordings():
    results = []

    steam_user_dir = ""

    if os.name == "nt":
        decky.logger.info("scan_steam_recordings - Windows detected")
        steam_dir = Path(get_steam_dir())
        if not (steam_dir and steam_dir.exists()):
            return results
        steam_user_dir = steam_dir / "userdata"
    else:      
        decky.logger.info("scan_steam_recordings - Linux detected")
        if not STEAM_USERDATA_DIR.exists():
            return results
        steam_user_dir = STEAM_USERDATA_DIR

    for user_dir in steam_user_dir.iterdir():
        if not user_dir.is_dir():
            continue

        clips_root = user_dir / "gamerecordings" / "clips"
        if not clips_root.exists():
            continue

        for clip_dir in clips_root.iterdir():
            if not clip_dir.is_dir():
                continue

            videos_dir = clip_dir / "video"
            for video_dir in videos_dir.iterdir():
                mpd = video_dir / "session.mpd"

                if not mpd.exists():
                    continue

                # detect audio stream by presence of init-stream1.m4s
                has_audio = (video_dir / "init-stream1.m4s").exists()

                results.append({
                    "userId": user_dir.name,
                    "clipId": clip_dir.name,
                    "basePath": str(clip_dir),
                    "videoDir": str(video_dir),
                    "mpd": str(mpd),
                    "thumbnail": str(clip_dir / "thumbnail.jpg")
                                if (clip_dir / "thumbnail.jpg").exists()
                                else None,
                    "hasAudio": has_audio
                })

    return results

def assemble_steam_clip(mpd_path: str, output_path: Path):
    if not output_path.parent.exists():
        output_path.parent.mkdir(parents=True, exist_ok=True)

    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg not found in PATH")

    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel", "error",
        "-i", mpd_path,
        "-c", "copy",
        str(output_path)
    ]

    subprocess.run(cmd, check=True)

def assemble_steam_clip_browser_compatible(mpd_path: str, output_path: Path):
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg not found in PATH")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel", "error",
        "-i", mpd_path,
        "-map", "0:v:0",
        "-map", "0:a:0",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-movflags", "+faststart",

        str(output_path)
    ]

    subprocess.run(cmd, check=True)
