#!/bin/bash
# Safe migration runner
# Usage: ./scripts/migrate.sh

set -e

echo "🔄 Running database migrations..."

# Check environment
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  exit 1
fi

# Run migrations
npx tsx drizzle/migrate.ts

echo "✅ Migrations complete"
