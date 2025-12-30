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
# Build - bcrypt
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
# Output - bcrypt
# --------------------------------------------------

echo "=== Copying Python package files ==="
cp -r /tmp/bcrypt_pkg/bcrypt/* ./out/bcrypt/

# --------------------------------------------------
# Creating SSL
# --------------------------------------------------
echo "=== Creating ssl folder and files ==="
mkdir -p ./out/ssl
realpath ./out/ssl

openssl req -x509 -newkey rsa:4096 -keyout ./out/ssl/key.pem -out ./out/ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" 2>/dev/null

chmod 644 ./out/ssl/*.pem 2>/dev/null || true

cp ./out/ssl/key.pem ./out/ssl/privatekey.pem 2>/dev/null || true
cp ./out/ssl/cert.pem ./out/ssl/certificate.pem 2>/dev/null || true

echo "=== ssl files created in ./out/ssl/ ==="
ls -la ./out/ssl/

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
