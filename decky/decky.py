from pathlib import Path
import logging
import os
import sys
import __main__
from datetime import datetime

# ----------------------------
# This class tries to mimic all commonly used decky loader' decky lib methods
# Useful for when you are coding without a steam deck
# DO NOT DISTRIBUTE THIS FOLDER TO PREVENT INCOMPATIBILITY WITH DECKY LOADER
# ----------------------------

# Mimic Decky's settings directory
SETTINGS_DIR = Path("./.decky_settings")
SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
DECKY_PLUGIN_SETTINGS_DIR = str(SETTINGS_DIR)

PLUGIN_DIR = Path(os.path.dirname(os.path.abspath(__main__.__file__)))
PLUGIN_DIR.mkdir(parents=True, exist_ok=True)
DECKY_PLUGIN_DIR = str(PLUGIN_DIR)

RUNTIME_DIR = Path("./.decky_plugin_runtime")
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
DECKY_PLUGIN_RUNTIME_DIR = str(RUNTIME_DIR)

LOG_DIR = Path("./.decky_log")
LOG_DIR.mkdir(parents=True, exist_ok=True)
DECKY_PLUGIN_LOG_DIR = str(LOG_DIR)

# ----------------------------
# Logging setup
# ----------------------------

_LOGGING_CONFIGURED = False

def _setup_logging():
    global _LOGGING_CONFIGURED
    if _LOGGING_CONFIGURED:
        return

    level_name = os.getenv("DECKY_LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    timestamp = datetime.now().strftime("%Y-%m-%d %H.%M.%S")
    log_file = os.path.join(DECKY_PLUGIN_LOG_DIR, f"{timestamp}.log")

    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(console_handler)
    root.addHandler(file_handler)

    _LOGGING_CONFIGURED = True

_setup_logging()

logging.getLogger("aiohttp.access").setLevel(logging.WARNING)

logger = logging.getLogger("decky")
logger.setLevel(logging.NOTSET)
logger.propagate = True
