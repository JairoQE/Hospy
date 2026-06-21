#!/bin/sh
set -e

echo "[hospy] migrate..."
python manage.py migrate --noinput

PORT="${PORT:-8080}"
WORKERS="${GUNICORN_WORKERS:-1}"
TIMEOUT="${GUNICORN_TIMEOUT:-120}"

echo "[hospy] gunicorn 0.0.0.0:${PORT} workers=${WORKERS}"
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --workers "${WORKERS}" \
  --timeout "${TIMEOUT}" \
  --access-logfile - \
  --error-logfile -
