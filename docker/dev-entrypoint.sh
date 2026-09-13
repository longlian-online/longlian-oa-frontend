#!/bin/sh
set -eu

if [ ! -f package.json ] || [ ! -f pnpm-lock.yaml ]; then
  echo "dev-entrypoint: package.json / pnpm-lock.yaml missing. Mount the project at /app." >&2
  exit 1
fi

# 空具名卷会从镜像拷入 node_modules。锁文件没变就别再装一遍。
stamp="node_modules/.pnpm-dev-stamp"
lock_hash() {
  sha256sum package.json pnpm-lock.yaml
}

if [ ! -x node_modules/.bin/vp ] || [ ! -f "$stamp" ] || [ "$(lock_hash)" != "$(cat "$stamp")" ]; then
  pnpm install --frozen-lockfile --ignore-scripts --prefer-offline
  lock_hash >"$stamp"
fi

exec "$@"
