from settings import SettingsManager
from pathlib import Path
import decky

SETTINGS_DIR = Path(decky.DECKY_PLUGIN_SETTINGS_DIR)

_credentials_manager = SettingsManager(name="credentials", settings_directory=SETTINGS_DIR)
_server_settings_manager = SettingsManager(name="server_settings", settings_directory=SETTINGS_DIR)

_credentials_manager.read()
_server_settings_manager.read()

def get_credentials_manager():
    return _credentials_manager

def get_server_settings_manager():
    return _server_settings_manager

def get_port():
    return _server_settings_manager.getSetting("port") or 8082

def save_port(port):
    _server_settings_manager.setSetting("port", port)