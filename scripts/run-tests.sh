#!/usr/bin/env bash
set -euo pipefail

echo "=== Python Test Runner ==="

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

PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_ROOT/.venv"
PYTHON="$VENV_DIR/bin/python"

echo "Project root : $PROJECT_ROOT"
echo "Virtual env  : $VENV_DIR"

# --------------------------------------------------
# Parse args (--install forces dependency reinstall)
# --------------------------------------------------
FORCE_INSTALL=0
PYTEST_ARGS=()

for arg in "$@"; do
  if [ "$arg" = "--install" ]; then
    FORCE_INSTALL=1
  else
    PYTEST_ARGS+=("$arg")
  fi
done

# --------------------------------------------------
# System Python for venv creation
# --------------------------------------------------
SYSTEM_PYTHON=""
if command -v python3 >/dev/null 2>&1; then
  SYSTEM_PYTHON="python3"
elif command -v python >/dev/null 2>&1; then
  SYSTEM_PYTHON="python"
else
  echo "❌ python3 or python not found in PATH"
  exit 1
fi

# --------------------------------------------------
# Virtual environment
# --------------------------------------------------
venv_is_healthy() {
  [ -x "$PYTHON" ] \
    && "$PYTHON" -c "import sys" >/dev/null 2>&1 \
    && "$PYTHON" -m pip --version >/dev/null 2>&1
}

if [ -d "$VENV_DIR" ] && ! venv_is_healthy; then
  echo "⚠️  Broken virtual environment detected, recreating..."
  rm -rf "$VENV_DIR"
fi

if [ ! -d "$VENV_DIR" ]; then
  echo "📦 Creating virtual environment..."
  "$SYSTEM_PYTHON" -m venv "$VENV_DIR"
fi

# --------------------------------------------------
# Dependencies
# --------------------------------------------------
needs_install=0
if [ "$FORCE_INSTALL" -eq 1 ]; then
  needs_install=1
elif ! "$PYTHON" -m pytest --version >/dev/null 2>&1; then
  needs_install=1
fi

if [ "$needs_install" -eq 1 ]; then
  echo "📦 Installing project and test dependencies..."
  "$PYTHON" -m pip install -e ".[test]"
fi

# --------------------------------------------------
# Run tests
# --------------------------------------------------
cd "$PROJECT_ROOT"
echo "🧪 Running pytest ${PYTEST_ARGS[*]:-}"
"$PYTHON" -m pytest "${PYTEST_ARGS[@]}"
