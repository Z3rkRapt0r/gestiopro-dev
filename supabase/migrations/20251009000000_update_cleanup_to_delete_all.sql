-- Migration: Update cleanup system to delete all notifications instead of old ones
-- Date: 2025-10-09

-- Drop old function if exists
DROP FUNCTION IF EXISTS public.cleanup_old_records(TEXT, TEXT);

-- Ensure cleanup_config table exists
CREATE TABLE IF NOT EXISTS public.cleanup_config (
  table_name TEXT PRIMARY KEY,
  retention_days INTEGER NOT NULL DEFAULT 30,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_cleanup_at TIMESTAMPTZ,
  last_cleaned_count INTEGER NOT NULL DEFAULT 0
);

-- Insert or update default configurations
INSERT INTO public.cleanup_config (table_name, retention_days, is_enabled)
VALUES 
  ('notifications', 30, TRUE),
  ('sent_notifications', 90, TRUE)
ON CONFLICT (table_name) 
DO UPDATE SET 
  is_enabled = EXCLUDED.is_enabled;

-- Create new function to cleanup all records
CREATE OR REPLACE FUNCTION public.cleanup_all_records(target_table TEXT)
RETURNS TABLE (deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_enabled BOOLEAN;
  v_sql TEXT;
BEGIN
  -- Check if cleanup is enabled for this table
  SELECT is_enabled
    INTO v_is_enabled
  FROM public.cleanup_config
  WHERE table_name = target_table;

  IF v_is_enabled IS NULL OR v_is_enabled = FALSE THEN
    -- If table not configured or disabled, return 0 without error
    deleted_count := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Build dynamic SQL to delete all rows
  v_sql := format(
    'WITH del AS (
       DELETE FROM %I
       RETURNING 1
     )
     SELECT COUNT(*)::int FROM del',
    target_table
  );

  RETURN QUERY EXECUTE v_sql;
END;
$$;

COMMENT ON FUNCTION public.cleanup_all_records(TEXT) IS 'Deletes all records from specified table based on cleanup_config and returns count';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.cleanup_all_records(TEXT) TO anon, authenticated, service_role;

