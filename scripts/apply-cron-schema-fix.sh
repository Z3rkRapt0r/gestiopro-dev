#!/bin/bash

# ============================================================================
# APPLY CRON SCHEMA PATH FIX
# ============================================================================
# Fixes the "relation does not exist" error in attendance_monitor_cron
# by explicitly specifying the 'public' schema for all table references
# ============================================================================

set -e

echo "🔧 Applying schema path fix for attendance_monitor_cron..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in to Supabase
echo "📡 Checking Supabase connection..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

# Get project ref from .env or ask user
PROJECT_REF=""
if [ -f .env ]; then
    # Extract project ref from VITE_SUPABASE_URL
    PROJECT_REF=$(grep VITE_SUPABASE_URL .env | cut -d '/' -f3 | cut -d '.' -f1)
    echo "✅ Found project ref: $PROJECT_REF"
else
    echo "⚠️  .env file not found"
    read -p "Enter your Supabase project ref (from URL): " PROJECT_REF
fi

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project ref is required"
    exit 1
fi

# Apply the SQL fix
echo ""
echo "📝 Applying SQL fix to database..."
echo ""

supabase db execute \
    --project-ref "$PROJECT_REF" \
    --file sql/fixes/fix_cron_schema_path.sql

echo ""
echo "✅ Schema path fix applied successfully!"
echo ""
echo "🎉 The attendance_monitor_cron should now work correctly"
echo ""
echo "ℹ️  Next steps:"
echo "   1. Test the cron by running: SELECT public.attendance_monitor_cron();"
echo "   2. Check the cron job logs in Supabase Dashboard"
echo "   3. Verify that attendance alerts are being created"
echo ""
