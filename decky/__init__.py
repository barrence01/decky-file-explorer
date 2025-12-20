from pathlib import Path
import logging
from .decky import _setup_logging 
import __main__
import os

# --------------------
# Settings dir
# --------------------
SETTINGS_DIR = Path("./.deckyloader-mock-env/.decky_settings")
SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
DECKY_PLUGIN_SETTINGS_DIR = str(SETTINGS_DIR)

PLUGIN_DIR = Path(os.path.dirname(os.path.abspath(__main__.__file__)))
PLUGIN_DIR.mkdir(parents=True, exist_ok=True)
DECKY_PLUGIN_DIR = str(PLUGIN_DIR)

RUNTIME_DIR = Path("./.deckyloader-mock-env/.decky_plugin_runtime")
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
DECKY_PLUGIN_RUNTIME_DIR = str(RUNTIME_DIR)

LOG_DIR = Path("./.deckyloader-mock-env/.decky_log")
LOG_DIR.mkdir(parents=True, exist_ok=True)
DECKY_PLUGIN_LOG_DIR = str(LOG_DIR)

# --------------------
# Logger
# --------------------
_setup_logging()
logger = logging.getLogger("decky")

__all__ = [
    "logger",
    "DECKY_PLUGIN_SETTINGS_DIR",
    "DECKY_PLUGIN_DIR",
    "DECKY_PLUGIN_RUNTIME_DIR",
    "DECKY_PLUGIN_LOG_DIR",
]
