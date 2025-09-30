-- ============================================================================
-- FIX FUNZIONE get_cleanup_stats
-- ============================================================================
-- Correzione del tipo di dato per COUNT(*) che restituisce bigint invece di integer
-- Data: 2025-01-17

-- ============================================================================
-- 1. CORREGGI FUNZIONE get_cleanup_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_cleanup_stats()
RETURNS TABLE (
  table_name TEXT,
  retention_days INTEGER,
  is_enabled BOOLEAN,
  last_cleanup_at TIMESTAMP WITH TIME ZONE,
  last_cleaned_count INTEGER,
  total_records BIGINT,
  old_records_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.table_name,
    cc.retention_days,
    cc.is_enabled,
    cc.last_cleanup_at,
    cc.last_cleaned_count,
    CASE 
      WHEN cc.table_name = 'notifications' THEN (SELECT COUNT(*) FROM public.notifications)
      WHEN cc.table_name = 'sent_notifications' THEN (SELECT COUNT(*) FROM public.sent_notifications)
      ELSE 0::BIGINT
    END as total_records,
    CASE 
      WHEN cc.table_name = 'notifications' THEN (
        SELECT COUNT(*) FROM public.notifications 
        WHERE created_at < NOW() - INTERVAL '1 day' * cc.retention_days
      )
      WHEN cc.table_name = 'sent_notifications' THEN (
        SELECT COUNT(*) FROM public.sent_notifications 
        WHERE created_at < NOW() - INTERVAL '1 day' * cc.retention_days
      )
      ELSE 0::BIGINT
    END as old_records_count
  FROM public.cleanup_config cc
  ORDER BY cc.table_name;
END;
$$;

-- ============================================================================
-- 2. TEST DELLA FUNZIONE CORRETTA
-- ============================================================================

SELECT 'Funzione get_cleanup_stats corretta!' as status;
SELECT * FROM public.get_cleanup_stats();

-- ============================================================================
-- 3. TEST COMPLETO DEL SISTEMA
-- ============================================================================

SELECT 'Test completo del sistema:' as info;
SELECT * FROM public.test_cleanup_system();

-- ============================================================================
-- PROBLEMA RISOLTO!
-- ============================================================================
-- Il problema era che COUNT(*) restituisce BIGINT, non INTEGER
-- Ora la funzione dovrebbe funzionare correttamente
-- ============================================================================
