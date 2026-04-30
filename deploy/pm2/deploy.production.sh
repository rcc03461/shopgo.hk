#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash deploy/pm2/deploy.production.sh
# Optional:
#   APP_NAME=hxm-oshop PORT=8555 bash deploy/pm2/deploy.production.sh

APP_NAME="${APP_NAME:-hxm-oshop}"
PORT="${PORT:-8555}"

echo "==> Installing dependencies"
bun install --frozen-lockfile

echo "==> Building Nuxt app"
bun run build

echo "==> Ensuring logs directory exists"
mkdir -p logs

echo "==> Starting or reloading PM2 app: ${APP_NAME} (port ${PORT})"
PORT="${PORT}" NITRO_PORT="${PORT}" pm2 startOrReload deploy/pm2/ecosystem.config.cjs --env production

echo "==> Saving PM2 process list"
pm2 save

echo "==> Current PM2 status"
pm2 status
