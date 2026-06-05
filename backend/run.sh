#!/usr/bin/env bash
# Arranque para desarrollo. En el VPS usar el systemd unit (ver README) o gunicorn/uvicorn
# detrás de nginx. --reload solo para dev.
set -euo pipefail
cd "$(dirname "$0")"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"
exec uvicorn app.main:app --host "$HOST" --port "$PORT" --reload
