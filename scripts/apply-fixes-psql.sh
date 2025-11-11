#!/bin/bash

# ============================================================================
# APPLY ALL FIXES USING PSQL
# ============================================================================

set -e

echo ""
echo "🔧 APPLICAZIONE FIXES AL DATABASE CON PSQL"
echo "=========================================="
echo ""

# Get DATABASE_URL from .env
if [ ! -f .env ]; then
    echo "❌ File .env non trovato"
    exit 1
fi

# Extract DATABASE_URL
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"')

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL non trovato in .env"
    exit 1
fi

echo "✅ DATABASE_URL caricato"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql non trovato. Installalo con:"
    echo "   macOS: brew install postgresql"
    echo "   Linux: apt-get install postgresql-client"
    exit 1
fi

echo "✅ psql trovato"
echo ""

# Apply fixes
echo "📝 Applicazione Fix 1: Timezone Straordinari..."
psql "$DATABASE_URL" -f sql/fixes/fix_timezone_automatic_overtime.sql

echo ""
echo "📝 Applicazione Fix 2: Cron Schema Path..."
psql "$DATABASE_URL" -f sql/fixes/fix_cron_schema_path.sql

echo ""
echo "🔍 Test finale..."
psql "$DATABASE_URL" -c "SELECT public.attendance_monitor_cron() as result;"

echo ""
echo "🎉 TUTTI I FIXES APPLICATI CON SUCCESSO!"
echo ""
