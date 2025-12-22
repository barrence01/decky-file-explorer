import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
import hashlib

import main
from main import Plugin

# ------------------------
# FIXTURES
# ------------------------

@pytest.fixture
def plugin():
    return Plugin()


@pytest.fixture
def mock_webserver():
    ws = MagicMock()
    ws.port = 8082
    ws.is_running = AsyncMock(return_value=False)
    ws.start = AsyncMock()
    ws.stop = AsyncMock()
    ws.get_ipv4 = AsyncMock(return_value="192.168.1.100")
    return ws


# ------------------------
# BASIC UTILITIES
# ------------------------

def test_get_server_port_without_server(monkeypatch, plugin):
    monkeypatch.setattr(
        main.settings_server,
        "getSetting",
        lambda key: 9090 if key == "port" else None
    )

    assert plugin.get_server_port() == 9090

def test_get_server_port_with_server(plugin):
    plugin.web_server = MagicMock(port=1234)
    assert plugin.get_server_port() == 1234


def test_is_port_free(plugin):
    # port 0 is always free
    assert plugin.is_port_free(0) is True


# ------------------------
# SERVER STATUS
# ------------------------

@pytest.mark.asyncio
async def test_status_offline(plugin):
    status = await plugin.get_file_explorer_status()

    assert isinstance(status, dict)
    assert status["data"]["status"] == "offline"
    assert status["data"]["ipv4_address"] is None
    assert status["data"]["port"] is None


@pytest.mark.asyncio
async def test_status_online(plugin, mock_webserver):
    plugin.web_server = mock_webserver
    mock_webserver.is_running.return_value = True

    status = await plugin.get_file_explorer_status()

    assert status["data"]["status"] == "online"
    assert status["data"]["ipv4_address"] == "192.168.1.100"
    assert status["data"]["port"] == 8082


# ------------------------
# START / STOP SERVER
# ------------------------

@pytest.mark.asyncio
async def test_start_server_creates_instance(monkeypatch, plugin, mock_webserver):
    monkeypatch.setattr(main, "WebServer", lambda **kwargs: mock_webserver)

    status = await plugin.start_file_explorer()

    assert status["data"]["status"] == "online"
    mock_webserver.start.assert_awaited()


@pytest.mark.asyncio
async def test_start_server_already_running(plugin, mock_webserver):
    mock_webserver.is_running.return_value = True
    plugin.web_server = mock_webserver

    status = await plugin.start_file_explorer()

    assert status["data"]["status"] == "online"
    mock_webserver.start.assert_not_awaited()


@pytest.mark.asyncio
async def test_start_server_error(monkeypatch, plugin):
    def explode(**kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(main, "WebServer", explode)

    status = await plugin.start_file_explorer()

    assert status["data"]["status"] == "offline"
    assert "boom" in status["message"]


@pytest.mark.asyncio
async def test_stop_server(plugin, mock_webserver):
    plugin.web_server = mock_webserver

    status = await plugin.stop_file_explorer()

    mock_webserver.stop.assert_awaited()
    assert status["data"]["status"] == "offline"


# ------------------------
# SETTINGS API
# ------------------------

@pytest.mark.asyncio
async def test_get_and_save_server_settings(plugin):
    await plugin.save_server_settings("port", 8082)
    res = await plugin.get_server_setting("port")

    assert isinstance(res, dict)
    assert res["data"] == 8082


@pytest.mark.asyncio
async def test_reset_settings(plugin):
    await plugin.reset_settings()

    assert main.settings_credentials.getSetting("user_login") == "admin"
    assert main.settings_server.getSetting("port") == 8082
    assert main.settings_server.getSetting("base_dir") is not None


# ------------------------
# LOGGING
# ------------------------

@pytest.mark.asyncio
async def test_log_info(plugin):
    await plugin.logInfo("hello")


@pytest.mark.asyncio
async def test_log_error(plugin):
    await plugin.logError("error")


# ------------------------
# LIFECYCLE
# ------------------------

@pytest.mark.asyncio
async def test_main_initializes_server(monkeypatch, plugin, mock_webserver):
    monkeypatch.setattr(main, "WebServer", lambda **kwargs: mock_webserver)

    await plugin._main()

    assert plugin.web_server is mock_webserver


@pytest.mark.asyncio
async def test_unload_stops_running_server(plugin, mock_webserver):
    mock_webserver.is_running.return_value = True
    plugin.web_server = mock_webserver

    await plugin._unload()

    mock_webserver.stop.assert_awaited()


@pytest.mark.asyncio
async def test_uninstall_stops_running_server(plugin, mock_webserver):
    mock_webserver.is_running.return_value = True
    plugin.web_server = mock_webserver

    await plugin._uninstall()

    mock_webserver.stop.assert_awaited()
