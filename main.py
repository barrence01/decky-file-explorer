import decky
from settings import SettingsManager

from backend.server import WebServer

from backend.filesystem import (
    FileSystemService
)

from pathlib import Path
import os
import socket
import hashlib

SETTINGS_DIR = Path(decky.DECKY_PLUGIN_SETTINGS_DIR)
SCRIPT_DIR = Path(decky.DECKY_PLUGIN_DIR)
LOG_DIR = Path(decky.DECKY_PLUGIN_LOG_DIR)

# Load user's settings
settings_credentials = SettingsManager(name="credentials", settings_directory=SETTINGS_DIR)
settings_credentials.read()

settings_server = SettingsManager(name="server_settings", settings_directory=SETTINGS_DIR)
settings_server.read()

fs = FileSystemService(settings_server.getSetting("base_dir") or os.path.expanduser("~"))

class ServerStatus:
    def __init__(self, status, ipv4_address, port: int, message = ""):
        if status:
            self.status = "online"
        else:
            self.status = "offline"
        self.ipv4_address = ipv4_address
        self.port = port
        self.message = message
        self.is_success = True

class ApiResponse:
    def __init__(self, data = "", message = "", is_success = True):
        self.data = data
        self.message = message
        self.is_success = is_success

class Plugin:

    def get_server_port(self) -> int:
        if self.web_server:
            return self.web_server.port
        else:
            return int(settings_server.getSetting("port")) # type: ignore
        
    def is_port_free(self, port:int):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) != 0
    
    def get_base_dir(self) -> Path:
        return Path(settings_server.getSetting("base_dir") or os.path.expanduser("~"))
    
    def hash_password(self, password: str) -> str:
        return hashlib.sha256(password.encode("utf-8")).hexdigest()
    
    # ----------------------------
    # Access to the server for the deckUI
    # ----------------------------
    async def get_file_explorer_status(self: 'Plugin'):
        is_online = False
        if self.web_server:
            if await self.web_server.is_running():
                is_online = True
        
        if is_online:
            return ServerStatus(is_online, await self.web_server.get_ipv4(), self.web_server.port)
        else:
            return ServerStatus(is_online, None, self.get_server_port())
        
    async def start_file_explorer(self: 'Plugin') -> ServerStatus:
        try:
            if not self.web_server:
                self.web_server = WebServer(
                    base_dir=self.get_base_dir(),
                    host="0.0.0.0",
                    port=self.get_server_port()
                )

            if await self.web_server.is_running():
                return ServerStatus(True, await self.web_server.get_ipv4(), self.get_server_port())
            else:
                await self.web_server.start()
                return ServerStatus(True, await self.web_server.get_ipv4(), self.get_server_port())
        except Exception as e:
            decky.logger.error("There was an error when trying to start the server: ", e)
            return ServerStatus(False, None, self.get_server_port(), str(e))
    
    async def stop_file_explorer(self: 'Plugin') -> ServerStatus:
        if self.web_server:
            await self.web_server.stop()
        return ServerStatus(False, None, self.get_server_port())
    
    # ----------------------------
    # Access to settings files for the deckUI
    # ----------------------------
    async def get_server_setting( self: 'Plugin', key: str ) -> ApiResponse:
        return ApiResponse(settings_server.getSetting( key )) # type: ignore
    
    async def get_credential_setting( self: 'Plugin', key: str ) -> ApiResponse:
        return ApiResponse(settings_server.getSetting( key )) # type: ignore
    
    async def save_user_settings( self: 'Plugin', key: str, value ) -> ApiResponse:
        decky.logger.info("Changing settings - {}: {}".format( key, value ))
        settings_credentials.setSetting( key, value )
        return ApiResponse()
    
    async def save_server_settings( self: 'Plugin', key: str, value ) -> ApiResponse:
        decky.logger.info("Changing settings - {}: {}".format( key, value ))
        settings_server.setSetting( key, value )
        return ApiResponse()

    async def reset_settings(self: 'Plugin'):
        settings_credentials.setSetting("user_login", "admin")
        settings_credentials.setSetting("password_hash", self.hash_password("admin"))
        settings_server.setSetting("port",8082)
        settings_server.setSetting("base_dir",os.path.expanduser("~"))
        
    # ----------------------------
    # Logging for the deckUI
    # ----------------------------
    async def logInfo( self, msg:str = "Javascript: no content" ):
        decky.logger.info(msg)


    async def logError( self, msg:str = "Javascript: no content" ):
        decky.logger.error(msg)
    # ----------------------------

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self: 'Plugin'):
        decky.logger.info("Hello World!")
        self.web_server = WebServer(
            base_dir=self.get_base_dir(),
            host="0.0.0.0",
            port=self.get_server_port()
        )

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

