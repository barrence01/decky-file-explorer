import json
from pathlib import Path
from threading import Lock

# ----------------------------
# This class tries to mimic all commonly used decky loader's settings lib methods
# Useful for when you are coding without a steam deck
# DO NOT DISTRIBUTE THIS FOLDER TO PREVENT INCOMPATIBILITY WITH DECKY LOADER
# ----------------------------

class SettingsManager:
    def __init__(self, name: str, settings_directory: Path):
        self.name = name
        self.settings_directory = settings_directory
        self.settings_directory.mkdir(parents=True, exist_ok=True)

        self.settings_file = self.settings_directory / f"{name}.json"
        self._lock = Lock()
        self._data = {}

    # Decky requires explicit read()
    def read(self):
        if self.settings_file.exists():
            with self._lock:
                self._data = json.loads(self.settings_file.read_text())
        else:
            self._data = {}
            self._flush()

    def _flush(self):
        with self._lock:
            self.settings_file.write_text(
                json.dumps(self._data, indent=2)
            )

    def getSetting(self, key: str):
        return self._data.get(key)

    def setSetting(self, key: str, value):
        self._data[key] = value
        self._flush()
