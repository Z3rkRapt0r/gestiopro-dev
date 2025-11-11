-- Fix Security Advisor Warnings
-- 1. Set search_path on all functions to prevent search_path injection attacks
-- 2. Move http extension from public schema

-- Fix search_path for all custom functions
ALTER FUNCTION public.json_to_text_array SET search_path = '';
ALTER FUNCTION public.convert_work_days_to_boolean SET search_path = '';
ALTER FUNCTION public.boolean_to_work_days_array SET search_path = '';
ALTER FUNCTION public.convert_boolean_to_work_days SET search_path = '';
ALTER FUNCTION public.attendance_monitor_cron SET search_path = '';
ALTER FUNCTION public.handle_app_general_settings_updated_at SET search_path = '';
ALTER FUNCTION public.handle_updated_at SET search_path = '';
ALTER FUNCTION public.test_new_calculation SET search_path = '';
ALTER FUNCTION public.cleanup_all_records SET search_path = '';
ALTER FUNCTION public.get_correct_day_of_week SET search_path = '';
ALTER FUNCTION public.debug_leave_calculation SET search_path = '';
ALTER FUNCTION public.test_date_calculation SET search_path = '';
ALTER FUNCTION public.test_old_calculation SET search_path = '';

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move http extension from public to extensions schema
-- Note: This requires dropping and recreating the extension
-- Make sure no code is currently using public.http
DROP EXTENSION IF EXISTS http CASCADE;
CREATE EXTENSION IF NOT EXISTS http SCHEMA extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

COMMENT ON SCHEMA extensions IS 'Schema for database extensions to keep them out of public schema';
