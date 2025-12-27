from settings import SettingsManager
from pathlib import Path
import decky
import os

SETTINGS_DIR = Path(decky.DECKY_PLUGIN_SETTINGS_DIR)

# CONSTANTS
PASSWORD_FIELD = "password_hash"
USERNAME_FIELD = "user_login"
MAX_LOGIN_ATTEMPT_FIELD = "login_attempt"

HOST_FIELD = "host"
PORT_FIELD = "port"
BASE_DIR_FIELD = "base_dir"
DEFAULT_TIMEOUT_FIELD = "shutdown_timeout_seconds"

DEFAULT_PORT = 8082
DEFAULT_HOST = "0.0.0.0"
DEFAULT_TIMEOUT_IN_SECONDS = 600 # 600s or 10m

_credentials_manager = SettingsManager(name="credentials", settings_directory=SETTINGS_DIR)
_server_settings_manager = SettingsManager(name="server_settings", settings_directory=SETTINGS_DIR)

_credentials_manager.read()
_server_settings_manager.read()

def get_credentials_manager() -> SettingsManager:
    return _credentials_manager

def get_server_settings_manager() -> SettingsManager:
    return _server_settings_manager

class CredentialsSettings:
    def __init__(self, username:str, password_hash: str, login_attempts:int):
        self.username = username
        self.password_hash = password_hash
        self.login_attempts = login_attempts

    def get_username(self) -> str:
        return self.username
    
    def get_password_hash(self) -> str:
        return self.password_hash
    
    def get_login_attempts(self) -> int:
        return self.login_attempts
    
    def to_dict(self) -> dict:
        return {
            "username": self.username,
            "password_hash": self.password_hash,
            "login_attempts":self.login_attempts
        }
    
class ServerSettings:
    def __init__(self, host:str, port: int, base_dir:str, shutdown_timeout:int):
        self.host = host
        self.port = port
        self.base_dir = base_dir
        self.shutdown_timeout = shutdown_timeout

    def get_host(self) -> str:
        return self.host
    
    def get_port(self) -> int:
        return self.port
    
    def get_base_dir(self) -> str:
        return self.base_dir
    
    def get_shutdown_timeout(self) -> int:
        return self.shutdown_timeout
    
    def to_dict(self) -> dict:
        return {
            "host": self.host,
            "port": self.port,
            "base_dir": self.base_dir,
            "shutdown_timeout": self.shutdown_timeout
        }
    
def get_credentials_settings() -> CredentialsSettings:
    username = str(_credentials_manager.getSetting(USERNAME_FIELD))
    password_hash = str(_credentials_manager.getSetting(PASSWORD_FIELD))
    login_attempts = int(_credentials_manager.getSetting(MAX_LOGIN_ATTEMPT_FIELD) or 0)
    return CredentialsSettings(username, password_hash, login_attempts)
    
def get_server_settings() -> ServerSettings:
    host = _server_settings_manager.getSetting(HOST_FIELD) or "0.0.0.0"
    port = _server_settings_manager.getSetting(PORT_FIELD) or DEFAULT_PORT
    base_dir = _server_settings_manager.getSetting(BASE_DIR_FIELD) or os.path.expanduser("~")
    shutdown_timeout = int(_server_settings_manager.getSetting(DEFAULT_TIMEOUT_FIELD) or DEFAULT_TIMEOUT_IN_SECONDS)
    return ServerSettings(host, port, base_dir, shutdown_timeout)