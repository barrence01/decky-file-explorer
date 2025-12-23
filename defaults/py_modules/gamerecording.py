from pathlib import Path
import subprocess
import shutil

STEAM_USERDATA_DIR = Path.home() / ".local/share/Steam/userdata"

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

    if not STEAM_USERDATA_DIR.exists():
        return results

    for user_dir in STEAM_USERDATA_DIR.iterdir():
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

def assemble_dash_to_mp4(mpd_path: str, output_path: Path):
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
