#!/bin/sh
set -eux

echo "=== Detecting system architecture ==="
ARCH=$(uname -m)
BITS=$(getconf LONG_BIT)
TARGET=""

echo "Architecture : $ARCH"
echo "Bitness      : $BITS-bit"

echo "=== Checking Python version ==="
python3 --version

if python3 -m pip --version >/dev/null 2>&1; then
  echo "pip is available"
else
  echo "pip not found"
  echo "installing pip"
    pacman -Sy --noconfirm \
    python \
    python-pip \
    python-setuptools \
    python-wheel

    python3 -m pip --version

    echo "setting python venv"
    python -m venv venv
    source venv/bin/activate
fi

python3 -m pip install maturin

# --------------------------------------------------
# Build
# --------------------------------------------------

echo "=== Getting python executable ==="
export PYTHON_SYS_EXECUTABLE=$(which python3)

echo "=== Install bcrypt ==="
python3 -m pip install bcrypt --no-deps --target /tmp/bcrypt_pkg


# --------------------------------------------------
# Output
# --------------------------------------------------

echo "=== Preparing output folder ==="
mkdir -p ../out/bcrypt
realpath ../out/bcrypt

echo "=== Copying Python package files ==="
cp -r /tmp/bcrypt_pkg/bcrypt ../out/

# --------------------------------------------------
# Verification
# --------------------------------------------------

echo "=== Verifying artifacts ==="
ls -lh ../out/bcrypt
ls -lh /tmp/bcrypt_pkg/bcrypt

echo "=== Verifying import ==="
python3 -c "import sys; sys.path.insert(0, '/backend/out'); import bcrypt; print('bcrypt imported successfully!')"

echo "=== Cleaning environment ==="
cd /backend
rm -rf venv
rm -rf /tmp/bcrypt_pkg/bcrypt

echo "=== Build complete ==="
