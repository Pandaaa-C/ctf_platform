#!/bin/sh
set -e
echo "[entrypoint] running database migrations…"
node scripts/migrate.mjs
echo "[entrypoint] seeding admin account…"
node scripts/seed.mjs
echo "[entrypoint] starting server…"
exec node server.js
