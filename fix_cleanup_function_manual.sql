-- ============================================================================
-- FIX: Cleanup Function - Da eseguire MANUALMENTE nel SQL Editor di Supabase
-- ============================================================================
-- Problema: La funzione cleanup_all_records non elimina i record perché
-- RLS (Row Level Security) potrebbe bloccare il DELETE anche con SECURITY DEFINER
-- ============================================================================

-- 1. DROP della vecchia funzione
DROP FUNCTION IF EXISTS public.cleanup_all_records(TEXT);

-- 2. CREA la nuova funzione con SECURITY DEFINER che bypassa RLS
CREATE OR REPLACE FUNCTION public.cleanup_all_records(target_table TEXT)
RETURNS TABLE (deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER -- Esegue con i permessi del proprietario (postgres)
SET search_path = public -- Sicurezza: limita il search path
AS $$
DECLARE
  v_is_enabled BOOLEAN;
  v_sql TEXT;
  v_count INTEGER;
BEGIN
  -- Log per debug
  RAISE NOTICE 'cleanup_all_records chiamata per tabella: %', target_table;
  
  -- Check if cleanup is enabled for this table
  SELECT is_enabled
    INTO v_is_enabled
  FROM public.cleanup_config
  WHERE table_name = target_table;

  RAISE NOTICE 'is_enabled per %: %', target_table, v_is_enabled;

  IF v_is_enabled IS NULL OR v_is_enabled = FALSE THEN
    -- If table not configured or disabled, return 0 without error
    RAISE NOTICE 'Cleanup disabilitato o non configurato per %', target_table;
    deleted_count := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Costruisci ed esegui il DELETE
  -- IMPORTANTE: Usa DELETE diretto, senza CTE
  v_sql := format('DELETE FROM public.%I', target_table);
  
  RAISE NOTICE 'Eseguo SQL: %', v_sql;
  
  -- Esegui e conta i record eliminati
  EXECUTE v_sql;
  
  -- Ottieni il numero di righe eliminate
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RAISE NOTICE 'Record eliminati da %: %', target_table, v_count;
  
  deleted_count := v_count;
  RETURN NEXT;
  RETURN;
END;
$$;

-- 3. Commento
COMMENT ON FUNCTION public.cleanup_all_records(TEXT) IS 'Deletes all records from specified table based on cleanup_config and returns count. Uses SECURITY DEFINER to bypass RLS.';

-- 4. Grant permessi
GRANT EXECUTE ON FUNCTION public.cleanup_all_records(TEXT) TO anon, authenticated, service_role;

-- 5. TEST MANUALE (decommenta per testare SENZA eliminare)
-- SELECT * FROM public.cleanup_all_records('sent_notifications');

-- ============================================================================
-- DOPO AVER ESEGUITO QUESTO SCRIPT:
-- 1. Vai nell'app
-- 2. Clicca su "Aggiorna Statistiche" 
-- 3. Clicca su "Esegui Pulizia"
-- 4. Dovrebbe eliminare i 37 record
-- ============================================================================

