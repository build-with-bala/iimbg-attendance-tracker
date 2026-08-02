#!/bin/sh
set -e
echo "→ prisma db push (sync schema)…"
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss || echo "db push failed (continuing)"
echo "→ starting Next.js…"
exec node server.js
