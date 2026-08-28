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
# Build - Angular webui
# --------------------------------------------------

if [ -d "/project/webui" ]; then
  echo "=== Preparing Node.js for webui build ==="
  if ! command -v node >/dev/null 2>&1; then
    pacman -Sy --noconfirm nodejs npm
  fi

  if ! command -v pnpm >/dev/null 2>&1; then
    npm install -g pnpm@9
  fi

  echo "=== Building Angular webui ==="
  cd /project/webui
  pnpm install --frozen-lockfile
  pnpm run build

  if [ ! -f "/project/defaults/py_modules/webui/index.html" ]; then
    echo "ERROR: webui build output not found"
    exit 1
  fi

  echo "=== Webui build completed ==="
else
  echo "=== Webui source not found at /project/webui, skipping ==="
fi

cd /backend

# --------------------------------------------------
# Verification
# --------------------------------------------------

echo "=== Verifying artifacts ==="
ls -lh /backend/out/bcrypt
ls -lh /tmp/bcrypt_pkg/bcrypt

echo "=== Cleaning environment ==="
rm -rf /backend/venv
rm -rf /tmp

echo "=== Build complete ==="
