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

-- 2) Create RPC to cleanup old records based on cleanup_config
-- This function deletes rows older than the configured retention_days for the given table
-- and returns the number of deleted rows.
CREATE OR REPLACE FUNCTION public.cleanup_old_records(target_table TEXT, date_column TEXT)
RETURNS TABLE (deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_retention_days INTEGER;
  v_sql TEXT;
BEGIN
  -- Get retention days from config; if not found default to 30
  SELECT COALESCE(retention_days, 30)
    INTO v_retention_days
  FROM public.cleanup_config
  WHERE table_name = target_table
    AND is_enabled = TRUE;

  IF v_retention_days IS NULL THEN
    -- If table not configured or disabled, return 0 without error
    deleted_count := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Build dynamic SQL to delete old rows
  v_sql := format(
    'WITH del AS (
       DELETE FROM %I
       WHERE %I < NOW() - INTERVAL ''1 day'' * %s
       RETURNING 1
     )
     SELECT COUNT(*)::int FROM del',
    target_table,
    date_column,
    v_retention_days::text
  );

  RETURN QUERY EXECUTE v_sql;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_records(TEXT, TEXT) IS 'Deletes old records by retention from cleanup_config and returns count';

-- Optional: grant execute to authenticated roles if needed; Edge uses service role
GRANT EXECUTE ON FUNCTION public.cleanup_old_records(TEXT, TEXT) TO anon, authenticated, service_role;

-- 3) Basic test queries (safe to run)
-- SELECT * FROM public.cleanup_config;
-- SELECT * FROM public.cleanup_old_records('notifications', 'created_at');
-- SELECT * FROM public.cleanup_old_records('sent_notifications', 'created_at');

-- ============================================================================
-- END
-- ============================================================================


