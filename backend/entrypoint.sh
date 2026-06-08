#!/bin/sh
set -eu

mkdir -p /app/logs /app/static/uploads
chown -R appuser:appgroup /app/logs || true

if [ "$(id -u)" = "0" ]; then
  exec gosu appuser "$@"
fi

exec "$@"
