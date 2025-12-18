from pathlib import Path
import logging

# --------------------
# Settings dir
# --------------------
DECKY_PLUGIN_SETTINGS_DIR = Path("./.decky_settings")
DECKY_PLUGIN_SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
DECKY_PLUGIN_DIR = Path("./.decky_plugin")
DECKY_PLUGIN_DIR.mkdir(parents=True, exist_ok=True)
DECKY_PLUGIN_LOG_DIR = Path("./.decky_log")
DECKY_PLUGIN_LOG_DIR.mkdir(parents=True, exist_ok=True)

# --------------------
# Logger
# --------------------
logger = logging.getLogger("decky")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(name)s: %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

__all__ = [
    "logger",
    "DECKY_PLUGIN_SETTINGS_DIR",
    "DECKY_PLUGIN_DIR",
    "DECKY_PLUGIN_LOG_DIR"
]
