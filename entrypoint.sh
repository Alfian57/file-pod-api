#!/bin/sh
set -e

# =============================================================================
# File Pod API Entrypoint
# =============================================================================
# Environment variables for database operations:
#   RUN_MIGRATE=true     - Run Prisma migrations before starting
#   RUN_SEEDER=true      - Run database seeders
# =============================================================================

echo "🚀 Starting File Pod API..."

# Database migrations with Prisma
if [ "$RUN_MIGRATE" = "true" ] || [ "$RUN_MIGRATE_FRESH" = "true" ]; then
  echo "📦 Running Prisma migrations..."
  npx prisma migrate deploy
fi

if [ "$RUN_SEEDER" = "true" ]; then
  echo "🌱 Running database seeders..."
  # Prisma doesn't have a built-in seeder, so this would run a custom script if it exists
  if [ -f "/app/dist/seed.cjs" ]; then
    node /app/dist/seed.cjs
  elif [ -f "/app/prisma/seed.js" ]; then
    node /app/prisma/seed.js
  else
    echo "⚠️  No seeder script found"
  fi
fi

echo "✅ Starting server..."
exec "$@"
