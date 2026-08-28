FROM ghcr.io/steamdeckhomebrew/holo-toolchain-rust:latest

RUN pacman -Sy --noconfirm nodejs npm && npm install -g pnpm@9

WORKDIR /backend
COPY . .

ENTRYPOINT ["/backend/entrypoint.sh"]
