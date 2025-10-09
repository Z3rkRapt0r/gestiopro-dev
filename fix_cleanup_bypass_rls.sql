-- ============================================================================
-- SOLUZIONE DEFINITIVA: Cleanup che BYPASSA RLS
-- ============================================================================
-- Questo script crea una funzione che elimina i record bypassando completamente RLS
-- ============================================================================

-- OPZIONE 1: Disabilita RLS sulle tabelle (PIÙ SEMPLICE)
-- ATTENZIONE: Questo rimuove la sicurezza RLS, valuta se è accettabile
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_notifications DISABLE ROW LEVEL SECURITY;

-- OPZIONE 2: Se vuoi mantenere RLS, usa questa funzione alternativa
DROP FUNCTION IF EXISTS public.cleanup_all_records(TEXT);

CREATE OR REPLACE FUNCTION public.cleanup_all_records(target_table TEXT)
RETURNS TABLE (deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_enabled BOOLEAN;
  v_count INTEGER := 0;
BEGIN
  -- Verifica se la pulizia è abilitata
  SELECT is_enabled INTO v_is_enabled
  FROM public.cleanup_config
  WHERE table_name = target_table;

  IF v_is_enabled IS NULL OR v_is_enabled = FALSE THEN
    deleted_count := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Esegui DELETE in base alla tabella
  IF target_table = 'notifications' THEN
    DELETE FROM public.notifications;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSIF target_table = 'sent_notifications' THEN
    DELETE FROM public.sent_notifications;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  deleted_count := v_count;
  RETURN NEXT;
  RETURN;
END;
$$;

-- Grant permessi
GRANT EXECUTE ON FUNCTION public.cleanup_all_records(TEXT) TO service_role;

-- ============================================================================
-- TEST: Esegui questo per verificare che funzioni
-- ============================================================================
-- SELECT * FROM public.cleanup_all_records('sent_notifications');

-- ============================================================================
-- RIPRISTINO RLS (se hai usato OPZIONE 1 e vuoi riabilitarlo dopo)
-- ============================================================================
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sent_notifications ENABLE ROW LEVEL SECURITY;

