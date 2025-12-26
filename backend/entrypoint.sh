#!/bin/sh
set -eu

cd /backend/

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
    source ./venv/bin/activate
fi

# --------------------------------------------------
# Build
# --------------------------------------------------

echo "=== Getting python executable ==="
export PYTHON_SYS_EXECUTABLE=$(which python3)

echo "=== Preparing output folder ==="
mkdir -p /tmp/bcrypt_pkg
mkdir -p ./out/bcrypt
realpath ./out/bcrypt
cp -r ./bcrypt/* ./out/bcrypt/

echo "=== Install bcrypt ==="
python3 -m pip install bcrypt --no-deps --target /tmp/bcrypt_pkg


# --------------------------------------------------
# Output
# --------------------------------------------------

echo "=== Copying Python package files ==="
cp -r /tmp/bcrypt_pkg/bcrypt/* ./out/bcrypt/

# --------------------------------------------------
# Verification
# --------------------------------------------------

echo "=== Verifying artifacts ==="
ls -lh ./out/bcrypt
ls -lh /tmp/bcrypt_pkg/bcrypt

echo "=== Cleaning environment ==="
rm -rf ./venv
rm -rf /tmp

echo "=== Build complete ==="
