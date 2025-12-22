import decky
import sys
from pathlib import Path
from typing import Any

SETTINGS_DIR = Path(decky.DECKY_PLUGIN_SETTINGS_DIR)
SCRIPT_DIR = Path(decky.DECKY_PLUGIN_DIR)
PYTHON_DIR = Path(decky.DECKY_PLUGIN_DIR) / "defaults/py_modules"
PYTHON_EXTERNAL_LIBS_DIR = Path(decky.DECKY_PLUGIN_DIR) / "defaults/py_modules/externals"
LOG_DIR = Path(decky.DECKY_PLUGIN_LOG_DIR)

sys.path.insert(0, str(PYTHON_DIR))
sys.path.insert(0, str(PYTHON_EXTERNAL_LIBS_DIR))

import server
from server import WebServer      

import os
import socket
import json
from utils import log_exceptions 


# Load user's settings
from shared_settings import get_server_settings_manager, get_credentials_manager

settings_credentials = get_credentials_manager()
settings_server = get_server_settings_manager()


# =========================
# Exceptions
# =========================

class IllegalKeyError(Exception):
    pass

class InvalidPasswordFormatError(Exception):
    pass

class InvalidArgumentException(Exception):
    pass

# =========================
# Responses
# =========================

class ServerStatus:
    def __init__(self, status:bool, ipv4_address, port: int | None):
        if status:
            self.status = "online"
        else:
            self.status = "offline"
        self.ipv4_address = ipv4_address
        self.port = port
    
    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "ipv4_address": self.ipv4_address,
            "port": self.port,
        }

class ApiResponse:
    def __init__(self, data=None, message: str = "", is_success: bool = True):
        self.data = self._serialize(data)
        self.message = message
        self.is_success = is_success

    def _serialize(self, value):
        if value is None:
            return None

        if isinstance(value, (str, int, float, bool, list, dict)):
            return value

        if hasattr(value, "to_dict") and callable(value.to_dict):
            return value.to_dict()

        # last-resort safety (prevents Decky crash)
        return json.dumps(value)

    def to_dict(self) -> dict:
        return {
            "success": self.is_success,
            "message": self.message,
            "data": self.data,
        }

class Plugin:
    def __init__(self):
        self.web_server = None
        
    def get_server_port(self) -> int:
        if self.web_server:
            return self.web_server.port
        else:
            return int(settings_server.getSetting("port") or 8082) # type: ignore
        
    def is_port_free(self, port:int):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) != 0

    def check_path_exists_non_root(self, path: str) -> bool:
        if not path or not isinstance(path, str):
            return False

        normalized_path = os.path.normpath(path)

        # Disallow root directory
        if normalized_path == os.sep:
            return False

        return os.path.isdir(normalized_path)
    
    # ----------------------------
    # Access to the server for the deckUI
    # ----------------------------
    @log_exceptions
    async def check_plugin_health(self: 'Plugin') -> dict[str, Any]:
        return ApiResponse().to_dict()
    
    @log_exceptions
    async def get_file_explorer_status(self: 'Plugin') -> dict[str, Any]:
        is_online = False
        if self.web_server:
            if await self.web_server.is_running():
                is_online = True
        
        try: 
            if is_online:
                return ApiResponse(ServerStatus(is_online, await self.web_server.get_ipv4(), self.web_server.port)).to_dict()
        except OSError as e:
            decky.logger.exception(f"Couldn't get server status: {str(e)}")
            await self.stop_file_explorer()
            is_online = False
        
        return ApiResponse(ServerStatus(is_online, None, None)).to_dict()
    
    @log_exceptions
    async def start_file_explorer(self: 'Plugin') -> dict[str, Any]:
        try:
            if not self.web_server:
                self.web_server = WebServer()

            if await self.web_server.is_running():
                return ApiResponse(ServerStatus(True, await self.web_server.get_ipv4(), self.get_server_port())).to_dict()
            else:
                await self.web_server.start()
                return ApiResponse(ServerStatus(True, await self.web_server.get_ipv4(), self.get_server_port())).to_dict()
        except Exception as e:
            decky.logger.error(f"There was an error when trying to start the server: {e}")
            return ApiResponse(ServerStatus(False, None, self.get_server_port()), str(e)).to_dict()
    
    @log_exceptions
    async def stop_file_explorer(self: 'Plugin') -> dict[str, Any]: # type: ignore
        if self.web_server:
            await self.web_server.stop()
        return ApiResponse(ServerStatus(False, None, self.get_server_port())).to_dict()
    
    # ----------------------------
    # Access to settings files for the deckUI
    # ----------------------------
    @log_exceptions
    async def get_server_setting( self: 'Plugin', key: str ) -> dict[str, Any]:
        return ApiResponse(settings_server.getSetting( key )).to_dict() # type: ignore
    
    @log_exceptions
    async def get_credential_setting( self: 'Plugin', key: str ) -> dict[str, Any]:
        if key is not None and "password" in key:
            raise IllegalKeyError("it was not possible to get the key value.")
        return ApiResponse(settings_server.getSetting( key )).to_dict() # type: ignore
    
    @log_exceptions
    async def save_user_username( self: 'Plugin', value: str ) -> dict[str, Any]:
        decky.logger.info("Changing username settings")
        if value is None or value.strip() == "":
            raise InvalidArgumentException("The password can't be blank")
        
        settings_credentials.setSetting( server.USERNAME_FIELD, value )
        return ApiResponse().to_dict()
    
    @log_exceptions
    async def save_user_password( self: 'Plugin', value: str ) -> dict[str, Any]:
        decky.logger.info("Changing password settings")
        if value is None or value.strip() == "":
            raise InvalidPasswordFormatError("The password can't be blank")
        value = server.hash_password(value)
        settings_credentials.setSetting( server.PASSWORD_FIELD, value )
        return ApiResponse().to_dict()
    
    @log_exceptions
    async def save_timeout_settings( self: 'Plugin', value: int ) -> dict[str, Any]:
        decky.logger.info(f"Changing timeout settings to {value}")
        if value is None:
            value = server.DEFAULT_TIMEOUT_IN_SECONDS
            decky.logger.info(f"Invalid value for timeout, using the default value of {server.DEFAULT_TIMEOUT_IN_SECONDS}")
        settings_server.setSetting( server.DEFAULT_TIMEOUT_FIELD, value )
        return ApiResponse().to_dict()
    
    @log_exceptions
    async def get_timeout_settings( self: 'Plugin' ) -> dict[str, Any]:
        return ApiResponse(settings_server.getSetting(server.DEFAULT_TIMEOUT_FIELD) or server.DEFAULT_TIMEOUT_IN_SECONDS).to_dict()
    
    @log_exceptions
    async def save_server_settings( self: 'Plugin', key: str, value: Any ) -> dict[str, Any]:
        decky.logger.info("Changing settings - {}: {}".format( key, value ))
        settings_server.setSetting( key, value )
        return ApiResponse().to_dict()

    @log_exceptions
    async def reset_settings(self: 'Plugin'):
        settings_credentials.setSetting("user_login", "admin")
        settings_credentials.setSetting("password_hash", server.hash_password("admin"))
        settings_server.setSetting("port",8082)
        settings_server.setSetting("base_dir",os.path.expanduser("~"))
        settings_server.setSetting( server.DEFAULT_TIMEOUT_FIELD, server.DEFAULT_TIMEOUT_IN_SECONDS )

    # ----------------------------
    # Util for the deckUI
    # ----------------------------
    async def check_path_exists(self: 'Plugin', path: str) -> dict[str, Any]:
        return ApiResponse(self.check_path_exists_non_root(path)).to_dict()


    # ----------------------------
    # Logging for the deckUI
    # ----------------------------
    @log_exceptions
    async def logInfo( self, msg:str = "Javascript: no content" ):
        decky.logger.info(msg)

    @log_exceptions
    async def logError( self, msg:str = "Javascript: no content" ):
        decky.logger.error(msg)
    # ----------------------------

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self: 'Plugin'):
        decky.logger.info("Hello World!")
        self.web_server = WebServer()

    # Function called first during the unload process, utilize this to handle your plugin being removed
    async def _unload(self: 'Plugin'):
        if self.web_server and await self.web_server.is_running():
            decky.logger.warning("Closing DeckyFileExplorer. Stopping server instance...")
            await self.web_server.stop()

    # Function called first during the uninstall process, utilize this to handle your plugin being uninstalled
    async def _uninstall(self: 'Plugin'):
        decky.logger.warning(f"Attempting to uninstall DeckyFileExplorer")

        if self.web_server and await self.web_server.is_running():
            decky.logger.warning("Closing DeckyFileExplorer. Stopping server instance...")
            await self.web_server.stop()

