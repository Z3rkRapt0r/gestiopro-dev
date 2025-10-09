-- ============================================================================
-- SETUP NOTIFICATIONS CLEANUP SYSTEM
-- Creates required table and RPC used by the Edge Function notifications-cleanup
-- Date: 2025-10-07
-- ============================================================================

-- 1) Create configuration table if not exists
CREATE TABLE IF NOT EXISTS public.cleanup_config (
  table_name TEXT PRIMARY KEY,
  retention_days INTEGER NOT NULL DEFAULT 30,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_cleanup_at TIMESTAMPTZ,
  last_cleaned_count INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.cleanup_config IS 'Config for automatic cleanup per table';

-- Seed defaults if missing (notifications and sent_notifications)
INSERT INTO public.cleanup_config (table_name, retention_days, is_enabled)
SELECT t.table_name, t.retention_days, t.is_enabled
FROM (
  VALUES 
    ('notifications', 30, TRUE),
    ('sent_notifications', 90, TRUE)
) AS t(table_name, retention_days, is_enabled)
ON CONFLICT (table_name) DO NOTHING;

-- 2) Create RPC to cleanup records based on cleanup_config
-- This function deletes all records from the specified table
-- and returns the number of deleted rows.
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

-- Optional: grant execute to authenticated roles if needed; Edge uses service role
GRANT EXECUTE ON FUNCTION public.cleanup_all_records(TEXT) TO anon, authenticated, service_role;

-- 3) Basic test queries (safe to run)
-- SELECT * FROM public.cleanup_config;
-- SELECT * FROM public.cleanup_all_records('notifications');
-- SELECT * FROM public.cleanup_all_records('sent_notifications');

-- ============================================================================
-- END
-- ============================================================================




