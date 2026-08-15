#!/bin/sh
# Apply schema, then start the API.
#
# Prisma migrations are the source of truth for the database. `migrate deploy`
# only applies pending migrations and is a no-op once the DB is current, so it
# is safe to run on every container start.
set -e

echo "[entrypoint] applying database migrations..."
npx prisma migrate deploy

# Reference data (modules, episodes, content, quizzes). The seed script uses
# upserts throughout, so re-running it is safe. Off by default: set
# SEED_ON_START=true to load or refresh reference data on boot.
if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] seeding reference data..."
  node dist/scripts/seed.js
fi

echo "[entrypoint] starting API..."
exec "$@"
