# Build & Development Guide

This document covers how to run tests, build the plugin package, and access logs when developing **decky-file-explorer**.

## Overview

The project has four main parts:

- **Decky UI** — TypeScript/React in `src/`, bundled with Rollup via `@decky/rollup` (`rollup.config.js` → `dist/`)
- **Browser WebUI** — Angular standalone app in `webui/`, built to `defaults/py_modules/webui/`
- **Backend** — Python (`main.py` + `defaults/py_modules/`), with native dependencies in `bin/` (bcrypt, SSL certs)
- **Packaging** — `decky-file-explorer.zip` produced by `scripts/build-plugin.sh`

```mermaid
flowchart LR
  subgraph deckyUI [Decky UI]
    src[src/] --> rollup[Rollup]
    rollup --> dist[dist/]
  end
  subgraph browserUI [Browser WebUI]
    webuiSrc[webui/] --> ngBuild[Angular build]
    ngBuild --> webuiOut[defaults/py_modules/webui/]
  end
  subgraph backend [Backend]
    docker[Podman/Docker] --> bin[bin/bcrypt + bin/ssl + webui build]
    py[main.py + defaults/] --> zip[decky-file-explorer.zip]
  end
  dist --> zip
  webuiOut --> zip
  bin --> zip
```

## Prerequisites

| Tool | Used for | Notes |
|------|----------|-------|
| **Python 3.13+** | Tests | `.python-version` pins `3.13.1` |
| **pnpm** | Frontend build | Required by `package.json` |
| **Node.js** | Frontend build | Implicit via pnpm |
| **Podman or Docker** | Full build only | Podman preferred when both are installed (`scripts/build-plugin.sh`) |
| **zip / zipinfo** | Packaging | e.g. `sudo pacman -S zip` on Arch |

For manual Python setup, `scripts/dependencies.txt` lists minimal pip installs:

```bash
pip install -e .          # plugin runtime
pip install -e ".[test]"  # tests
```

## Running Tests

From the project root:

```bash
pnpm test
```

This is equivalent to:

```bash
bash scripts/run-tests.sh
```

The test runner (`scripts/run-tests.sh`) automatically:

1. Creates or repairs a `.venv` at the project root
2. Installs the editable package with test extras: `pip install -e ".[test]"`
3. Runs `pytest` using config from `pyproject.toml` (`testpaths = ["tests"]`, `asyncio_mode = "auto"`)

### Useful variants

```bash
# Force reinstall of test dependencies
bash scripts/run-tests.sh --install

# Pass pytest args through
bash scripts/run-tests.sh tests/test_server.py -v
bash scripts/run-tests.sh -k "test_log"
bash scripts/run-tests.sh --cov=defaults/py_modules
```

### Manual setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[test]"
pytest
```

### Test suite

The `tests/` directory contains 11 test modules covering the server, handlers, security, filesystem, zip, streaming, game recording, and the main plugin API.

## Building

### Full release build (recommended)

```bash
bash scripts/build-plugin.sh
```

The script performs these steps:

1. **Backend** (if `backend/` exists) — builds a Podman/Docker image from `backend/Dockerfile`, runs `backend/entrypoint.sh` to produce `backend/out/bcrypt`, `backend/out/ssl`, and the Angular webui build in `defaults/py_modules/webui/`, then copies bcrypt → `bin/` and SSL → `bin/ssl`
2. **WebUI fallback** — if the container did not produce `defaults/py_modules/webui/index.html`, builds `webui/` locally with pnpm
3. **Decky UI** — runs `pnpm install` (if needed) and `pnpm run build` (Rollup → `dist/`)
4. **Package** — stages files and directories, then creates `decky-file-explorer.zip` at the project root

The script validates that `dist/` and `defaults/py_modules/webui/index.html` exist and prints the zip size and file count on success.

> **Note:** `scripts/build-plugin.py` is a lighter alternative that runs `pnpm build`, builds the Angular webui, and creates the zip without the bcrypt/SSL container build. Use it for frontend-only packaging; the shell script is the canonical full build.

### Frontend-only build

For faster Decky UI iteration without rebuilding native dependencies:

```bash
pnpm install
pnpm run build   # one-shot Decky UI
pnpm run watch   # watch mode during Decky UI work
```

This produces `dist/index.js` (and related assets) without touching `bin/`.

### Browser WebUI development

The remote file manager UI lives in `webui/` and is served by the Python aiohttp server from `defaults/py_modules/webui/`.

```bash
cd webui
pnpm install
pnpm run build          # production build into defaults/py_modules/webui/
pnpm run watch          # rebuild on change during backend testing
pnpm start              # ng serve with API proxy to https://localhost:8082
```

From the project root you can also run:

```bash
pnpm run build:webui
pnpm run build:all      # Decky UI + browser webui
```

Typical local workflow:

```bash
source .venv/bin/activate
python dev_run.py       # starts HTTPS API on port 8082
cd webui && pnpm start  # Angular dev server with /api proxy
```

### Build artifacts

| Path | Description |
|------|-------------|
| `dist/` | Compiled Decky plugin UI (gitignored) |
| `webui/` | Angular source for the browser file manager |
| `defaults/py_modules/webui/` | Built browser webui static assets (gitignored except `.gitkeep`) |
| `bin/bcrypt/` | Prebuilt bcrypt module for the Steam Deck target |
| `bin/ssl/` | Self-signed cert/key for HTTPS |
| `decky-file-explorer.zip` | Installable plugin package |

## Obtaining Logs

### Local development

The repo includes a mock Decky environment in `decky/` for coding without a Steam Deck. Logging is configured in `decky/decky.py`:

| Setting | Value |
|---------|-------|
| **Directory** | `.deckyloader-mock-env/.decky_log/` (gitignored) |
| **Files** | Timestamped, e.g. `2026-08-28 12.14.30.log` |
| **Console** | Logs also go to stdout |
| **Log level** | `DECKY_LOG_LEVEL` env var (`INFO` default; also `DEBUG`, `WARNING`, `ERROR`, `CRITICAL`) |

Run the backend server locally:

```bash
source .venv/bin/activate   # after pip install -e .
DECKY_LOG_LEVEL=DEBUG python dev_run.py
```

Python code uses `decky.logger` throughout (`main.py`, `defaults/py_modules/server.py`). The frontend can forward messages via `logInfo` / `logError` RPC (`src/utils/ServerAPI.ts`).

### On Steam Deck (production)

Per [Deckbrew environment variables](https://wiki.deckbrew.xyz/plugin-dev/env-vars) and the plugin name in `plugin.json` (`"name": "DeckyFileExplorer"`):

| Setting | Value |
|---------|-------|
| **Log directory** | `/home/deck/homebrew/logs/DeckyFileExplorer/` |
| **Main log file** | `plugin.log` (via Decky's `DECKY_PLUGIN_LOG`) |

```bash
# On the Deck (Desktop Mode terminal)
tail -f ~/homebrew/logs/DeckyFileExplorer/plugin.log
```

Other ways to view logs:

- **Decky UI** — enable Developer Mode in Decky settings, then use the built-in log viewer
- **Loader service logs** — `journalctl | grep PluginLoader` (for loader-level issues, not plugin Python logs)
- **Restart after install** — `sudo systemctl restart plugin_loader`

### What gets logged

- Plugin lifecycle (`_main`, `_unload`, `_uninstall`)
- Web server start/stop and credential/login warnings
- Settings changes
- JavaScript errors forwarded from the frontend via `logError`

## Troubleshooting

| Problem | Likely fix |
|---------|------------|
| `pnpm not found` | Install pnpm globally |
| `Podman or Docker not found` | Install and start Podman or Docker; the build script exits if neither is available |
| `dist/ folder not found` | Run `pnpm run build` before packaging |
| `defaults/py_modules/webui/index.html not found` | Run `pnpm run build:webui` or `cd webui && pnpm run build` |
| Broken `.venv` | `rm -rf .venv && bash scripts/run-tests.sh` |
| Backend build permission issues | The build script may use `sudo` for SSL copy/cleanup on some systems |
