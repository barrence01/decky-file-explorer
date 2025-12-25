#!/bin/sh
set -ex

python3 --version

cd /backend/_bcrypt

cargo build --release

mkdir -p ../out/bcrypt
realpath ../out/bcrypt

cp -r ../bcrypt/* ../out/bcrypt/

ls -lh /backend/out/bcrypt

ls target/release

cp target/release/libbcrypt_rust.so ../out/bcrypt/_bcrypt.abi3.so

echo "=== Build complete ==="
ls -lh ../out/bcrypt