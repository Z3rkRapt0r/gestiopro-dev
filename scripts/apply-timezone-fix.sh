#!/bin/bash

# =====================================================
# APPLY TIMEZONE FIX TO SUPABASE DATABASE
# =====================================================
# This script applies the timezone fix for automatic
# overtime detection to your Supabase database
# =====================================================

set -e

echo "🔧 Applying timezone fix for automatic overtime detection..."
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
    --file sql/fixes/fix_timezone_automatic_overtime.sql

echo ""
echo "✅ Timezone fix applied successfully!"
echo ""
echo "🎉 The automatic overtime detection will now show the correct local time (Europe/Rome)"
echo ""
echo "ℹ️  Next steps:"
echo "   1. Test by doing a check-in before your scheduled time"
echo "   2. Verify that the overtime message shows the correct local time"
echo "   3. Check the overtime records in the admin panel"
echo ""
