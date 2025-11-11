-- =====================================================
-- VERIFY AUTOMATIC OVERTIME COLUMNS
-- =====================================================
-- Run this to check if the migration was applied correctly
-- =====================================================

-- Check if columns exist in admin_settings
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_settings'
  AND column_name IN ('enable_auto_overtime_checkin', 'auto_overtime_tolerance_minutes')
ORDER BY column_name;

-- Check if columns exist in overtime_records
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'overtime_records'
  AND column_name IN ('overtime_type', 'is_automatic', 'calculated_minutes', 'approval_status', 'reason')
ORDER BY column_name;

-- Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as trigger_type,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'trigger_automatic_overtime_checkin';

-- Check if functions exist
SELECT 
  proname as function_name,
  pronargs as num_args,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname IN ('calculate_automatic_overtime_checkin', 'has_automatic_overtime_for_date', 'get_blocked_overtime_dates')
  AND pronamespace = 'public'::regnamespace
ORDER BY proname;


