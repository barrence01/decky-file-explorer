#!/usr/bin/env bash
set -euo pipefail

echo "=== Plugin Build Script ==="

# --------------------------------------------------
# Resolve paths
# --------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_NAME="$(basename "$SCRIPT_DIR")"

if [ "$SCRIPT_NAME" != "scripts" ]; then
  echo "❌ This script must be located in a 'scripts/' directory."
  echo "   Current location: $SCRIPT_DIR"
  exit 1
fi

# --------------------------------------------------
# Validate script location
# --------------------------------------------------
ARCH=$(uname -m)
BITS=$(getconf LONG_BIT)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
BIN_DIR="$PROJECT_ROOT/bin"
OUT_DIR="$BACKEND_DIR/out"
BCRYPT_DIR="$OUT_DIR/bcrypt"
SSL_DIR="$OUT_DIR/ssl"

echo "Platform : $ARCH"
echo "Bitness  : $BITS-bit"
echo "Script directory : $SCRIPT_DIR"
echo "Project root     : $PROJECT_ROOT"
echo "Backend path     : $BACKEND_DIR"
echo "Bin path         : $BIN_DIR"

# --------------------------------------------------
# Check backend folder
# --------------------------------------------------

BACKEND_DIR_FOUND=0

if [ ! -d "$BACKEND_DIR" ]; then
  echo "⚠️  BACKEND folder not found. Skipping backend build."
else
  echo "✅ BACKEND folder found"
  BACKEND_DIR_FOUND=1
fi

# --------------------------------------------------
# Container engine availability check (Podman → Docker)
# --------------------------------------------------

CONTAINER_ENGINE=""

if command -v podman >/dev/null 2>&1; then
  if podman info >/dev/null 2>&1; then
    CONTAINER_ENGINE="podman"
    echo "✅ Podman available"
  fi
fi

if [ -z "$CONTAINER_ENGINE" ] && command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    CONTAINER_ENGINE="docker"
    echo "✅ Docker available (no sudo)"
  else
    echo "⚠️ Docker requires sudo."
    read -rp "👉 Run Docker with sudo? [Y/n]: " CONFIRM

    case "${CONFIRM,,}" in
      ""|"y"|"yes")
        CONTAINER_ENGINE="sudo docker"
        echo "✅ Using sudo docker"
        ;;
      *)
        echo "❌ Docker build skipped by user"
        ;;
    esac
  fi
fi

if [ -z "$CONTAINER_ENGINE" ]; then
  echo "❌ Podman or Docker not found/available"
  exit 1
fi

# --------------------------------------------------
# Container build & run
# --------------------------------------------------

if [ "$BACKEND_DIR_FOUND" -eq 1 ]; then
  echo "📦 Backend detected — building bcrypt"
  cd "$BACKEND_DIR"

  echo "🐳 Building container image..."
  if [ "$BITS" = "32" ]; then
    $CONTAINER_ENGINE build -t bcrypt-builder .
  else
    $CONTAINER_ENGINE build --platform=linux/amd64 -t bcrypt-builder .
  fi

  echo "🚀 Running container..."
  if [ "$BITS" = "32" ]; then
    $CONTAINER_ENGINE run --rm \
      -v "$BACKEND_DIR:/backend" \
      -v "$PROJECT_ROOT:/project" \
      bcrypt-builder
  else
    $CONTAINER_ENGINE run --rm \
      --platform=linux/amd64 \
      -v "$BACKEND_DIR:/backend" \
      -v "$PROJECT_ROOT:/project" \
      bcrypt-builder
  fi

  echo ""
  echo "✅ Backend build completed successfully"

  # --------------------------------------------------
  # Copy output
  # --------------------------------------------------

  if [ ! -d "$BCRYPT_DIR" ]; then
    echo "❌ Expected output not found: $BCRYPT_DIR"
    exit 1
  fi

  echo "📦 Copying bcrypt → bin/"

  mkdir -p "$BIN_DIR"
  rm -rf "$BIN_DIR/bcrypt"

  cp -r "$BCRYPT_DIR" "$BIN_DIR/"

  echo ""
  echo "✅ Backend build completed successfully"
  echo "➡ bcrypt copied to: $BCRYPT_DIR"
  echo "➡ ssl copied to: $SSL_DIR"
fi

WEBUI_INDEX="$PROJECT_ROOT/defaults/py_modules/webui/index.html"

if [ ! -f "$WEBUI_INDEX" ]; then
  echo "⚠️  Angular webui build output not found after container build"
  echo "🚧 Building Angular webui locally..."
  cd "$PROJECT_ROOT/webui"
  pnpm install --frozen-lockfile
  pnpm run build
fi

if [ ! -f "$WEBUI_INDEX" ]; then
  echo "❌ Angular webui build output not found at $WEBUI_INDEX"
  exit 1
fi

echo "✅ Angular webui build found at $WEBUI_INDEX"

# --------------------------------------------------
# PNPM CHECK
# --------------------------------------------------

if ! command -v pnpm >/dev/null 2>&1; then
  echo "❌ pnpm not found"
  exit 1
fi

NODE_MODULES_PATH="$PROJECT_ROOT/node_modules"

if [ ! -d "$NODE_MODULES_PATH" ]; then
  echo "📦 node_modules not found in project root."
  echo "➡ Running pnpm install..."
  cd "$PROJECT_ROOT"
  pnpm install
else
  echo "✅ Found node_modules in project root"
fi

# --------------------------------------------------
# BUILD
# --------------------------------------------------

echo "🚧 Running pnpm run build..."
cd "$PROJECT_ROOT"
pnpm run build

# --------------------------------------------------
# ZIP CHECK
# --------------------------------------------------

if ! command -v zip >/dev/null 2>&1 || ! command -v zipinfo >/dev/null 2>&1; then
  echo "❌ zip/zipinfo not found"
  echo "   Arch: sudo pacman -S zip"
  exit 1
fi

# --------------------------------------------------
# ZIP PREP
# --------------------------------------------------

ZIP_NAME="decky-file-explorer.zip"
PROJECT_NAME="decky-file-explorer"
ZIP_PATH="$PROJECT_ROOT/$ZIP_NAME"
STAGING_DIR="$PROJECT_ROOT/.zip_tmp/$PROJECT_NAME"

echo "📦 Creating ZIP from: $PROJECT_ROOT"

# Remove old zip
if [ -f "$ZIP_PATH" ]; then
  echo "🧹 Removing old zip"
  rm -f "$ZIP_PATH"
fi

# Files to include
FILES=(
  tsconfig.json
  README.md
  pyproject.toml
  plugin.json
  package.json
  main.py
  LICENSE
  THIRD-PARTY-NOTICES
  pnpm-lock.yaml
  rollup.config.js
  decky.pyi
)

# Directories to include
DIRS=(
  dist
  bin
  defaults
)

# Validate build output
if [ ! -d "$PROJECT_ROOT/dist" ]; then
  echo "❌ dist/ folder not found — build failed?"
  exit 1
fi

if [ ! -f "$WEBUI_INDEX" ]; then
  echo "❌ defaults/py_modules/webui/index.html not found — webui build failed?"
  exit 1
fi

# Create staging structure
mkdir -p "$STAGING_DIR"

# Copy files
for file in "${FILES[@]}"; do
  if [ -f "$PROJECT_ROOT/$file" ]; then
    cp "$PROJECT_ROOT/$file" "$STAGING_DIR/"
  fi
done

# Copy directories
for dir in "${DIRS[@]}"; do
  if [ -d "$PROJECT_ROOT/$dir" ]; then
    cp -r "$PROJECT_ROOT/$dir" "$STAGING_DIR/"
  fi
done

# Create zip
(
  cd "$PROJECT_ROOT/.zip_tmp"
  zip -r "$ZIP_PATH" "$PROJECT_NAME" \
    -x "**/__pycache__/*"
)

# Cleanup
rm -rf "$PROJECT_ROOT/.zip_tmp"
if [ -n "$CONTAINER_ENGINE" ] && [ "$BACKEND_DIR_FOUND" -eq 1 ]; then
  echo "📦 Copying SSL → bin/"
  sudo rm -rf "$BIN_DIR/ssl"
  sudo cp -r "$SSL_DIR" "$BIN_DIR/"
  echo " Deleting → out/"
  echo "$BACKEND_DIR/out"
  sudo rm -rf "$BACKEND_DIR/out"
fi

# --------------------------------------------------
# SUMMARY
# --------------------------------------------------

echo ""
echo "=============================="
echo "✅ BUILD COMPLETED SUCCESSFULLY"
echo "=============================="
echo "ZIP file: $ZIP_PATH"
echo "Size: $(du -h "$ZIP_PATH" | cut -f1)"
echo "Files in ZIP: $(zipinfo -1 "$ZIP_PATH" | wc -l)"
echo ""
echo "Top-level contents:"
zipinfo -1 "$ZIP_PATH" | awk -F/ '{print $1"/"}' | sort -u
echo ""
