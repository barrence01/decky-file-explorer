#!/bin/sh
set -eux

echo "=== Detecting system architecture ==="
ARCH=$(uname -m)
BITS=$(getconf LONG_BIT)
TARGET=""

echo "Architecture : $ARCH"
echo "Bitness      : $BITS-bit"

case "$ARCH" in
  x86_64)
    TARGET="x86_64-unknown-linux-gnu"
    ;;
  i686|i386)
    TARGET="i686-unknown-linux-gnu"
    ;;
  aarch64)
    TARGET="aarch64-unknown-linux-gnu"
    ;;
  *)
    echo "Unsupported architecture: $ARCH"
    TARGET="x86_64-unknown-linux-gnu"
    echo "Setting architecture to default: $TARGET"
    ;;
esac

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

echo "=== Rust version ==="
rustc --version

# --------------------------------------------------
# Build
# --------------------------------------------------

echo "=== Installing system dependencies ==="
cd /backend/_bcrypt

echo "=== Getting python executable ==="
export PYTHON_SYS_EXECUTABLE=$(which python3)

echo "=== Building Rust extension ==="
maturin build \
  --release \
  --compatibility manylinux_2_28 \
  --target "$TARGET"

# --------------------------------------------------
# Output
# --------------------------------------------------

echo "=== Preparing output folder ==="
mkdir -p ../out/bcrypt
realpath ../out/bcrypt

echo "=== Copying Python package files ==="
cp -r ../bcrypt/* ../out/bcrypt/

echo "=== Copying compiled binary ==="
cp "target/$TARGET/release/libbcrypt_rust.so" \
   "../out/bcrypt/_bcrypt.abi3.so"

# --------------------------------------------------
# Verification
# --------------------------------------------------

echo "=== Verifying artifacts ==="
ls -lh target/release
ls -lh target/release/build
ls -lh ../out/bcrypt

echo "=== Verifying import ==="
python3 -c "import sys; sys.path.insert(0, '/backend/out'); import bcrypt; print('bcrypt imported successfully!')"

echo "=== Build complete ==="
