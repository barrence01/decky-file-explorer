import subprocess
import shutil
from pathlib import Path
import pytest

import gamerecording


# ----------------------------
# convert_dash_folder_to_mp4
# ----------------------------

def test_convert_dash_missing_mpd(tmp_path):
    video_dir = tmp_path / "video"
    video_dir.mkdir()

    with pytest.raises(FileNotFoundError):
        gamerecording.convert_dash_folder_to_mp4(
            video_dir,
            tmp_path / "out.mp4"
        )


def test_convert_dash_ffmpeg_not_found(tmp_path, monkeypatch):
    video_dir = tmp_path / "video"
    video_dir.mkdir()
    (video_dir / "session.mpd").write_text("dummy")

    monkeypatch.setattr(shutil, "which", lambda _: None)

    with pytest.raises(RuntimeError, match="ffmpeg not found"):
        gamerecording.convert_dash_folder_to_mp4(
            video_dir,
            tmp_path / "out.mp4"
        )


def test_convert_dash_success(tmp_path, monkeypatch):
    video_dir = tmp_path / "video"
    video_dir.mkdir()
    (video_dir / "session.mpd").write_text("dummy")

    output = tmp_path / "out" / "video.mp4"

    monkeypatch.setattr(shutil, "which", lambda _: "/usr/bin/ffmpeg")

    called = {}

    def fake_run(cmd, check):
        called["cmd"] = cmd
        return subprocess.CompletedProcess(cmd, 0)

    monkeypatch.setattr(subprocess, "run", fake_run)

    gamerecording.convert_dash_folder_to_mp4(video_dir, output)

    assert output.parent.exists()
    assert "ffmpeg" in called["cmd"][0]
    assert str(output) in called["cmd"]


# ----------------------------
# assemble_dash_to_mp4
# ----------------------------

def test_assemble_ffmpeg_not_found(tmp_path, monkeypatch):
    monkeypatch.setattr(shutil, "which", lambda _: None)

    with pytest.raises(RuntimeError):
        gamerecording.assemble_dash_to_mp4(
            "file.mpd",
            tmp_path / "out.mp4"
        )


def test_assemble_success(tmp_path, monkeypatch):
    monkeypatch.setattr(shutil, "which", lambda _: "/usr/bin/ffmpeg")

    called = {}

    def fake_run(cmd, check):
        called["cmd"] = cmd
        return subprocess.CompletedProcess(cmd, 0)

    monkeypatch.setattr(subprocess, "run", fake_run)

    output = tmp_path / "out" / "final.mp4"

    gamerecording.assemble_dash_to_mp4("input.mpd", output)

    assert output.parent.exists()
    assert "input.mpd" in called["cmd"]
    assert str(output) in called["cmd"]


# ----------------------------
# scan_steam_recordings
# ----------------------------

def test_scan_steam_no_userdata(tmp_path, monkeypatch):
    monkeypatch.setattr(
        gamerecording,
        "STEAM_USERDATA_DIR",
        tmp_path / "missing"
    )

    results = gamerecording.scan_steam_recordings()
    assert results == []


def test_scan_steam_with_clip(tmp_path, monkeypatch):
    steam = tmp_path / "userdata"
    monkeypatch.setattr(gamerecording, "STEAM_USERDATA_DIR", steam)

    user = steam / "1234"
    clip = user / "gamerecordings" / "clips" / "clipA"
    video = clip / "video" / "0001"

    video.mkdir(parents=True)
    (video / "session.mpd").write_text("mpd")
    (video / "init-stream1.m4s").write_text("audio")
    (clip / "thumbnail.jpg").write_text("thumb")

    results = gamerecording.scan_steam_recordings()

    assert len(results) == 1
    item = results[0]

    assert item["userId"] == "1234"
    assert item["clipId"] == "clipA"
    assert item["hasAudio"] is True
    assert item["thumbnail"] is not None
