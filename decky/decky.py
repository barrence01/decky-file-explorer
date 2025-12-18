from pathlib import Path
import logging
import os
import sys

# ----------------------------
# This class tries to mimic all commonly used decky loader' decky lib methods
# Useful for when you are coding without a steam deck
# DO NOT DISTRIBUTE THIS FOLDER TO PREVENT INCOMPATIBILITY WITH DECKY LOADER
# ----------------------------

# Mimic Decky's settings directory
DECKY_PLUGIN_SETTINGS_DIR = Path("./.decky_settings")

DECKY_PLUGIN_SETTINGS_DIR.mkdir(parents=True, exist_ok=True)

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

    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    _LOGGING_CONFIGURED = True

_setup_logging()
logger = logging.getLogger("decky")