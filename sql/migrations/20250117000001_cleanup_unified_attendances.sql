-- ============================================================================
-- CLEANUP: Rimozione tabella unified_attendances dopo migrazione
-- Data: 2025-01-17
-- Descrizione: Rimuove la tabella unified_attendances e la vista temporanea
-- IMPORTANTE: Eseguire solo DOPO aver aggiornato tutto il codice React
-- ============================================================================

-- 1. VERIFICA FINALE DEI DATI MIGRATI
-- ============================================================================

DO $$
DECLARE
    unified_count INTEGER;
    attendances_count INTEGER;
    manual_attendances_count INTEGER;
    automatic_count INTEGER;
    manual_count INTEGER;
BEGIN
    -- Contare record in unified_attendances
    SELECT COUNT(*) INTO unified_count FROM public.unified_attendances;
    
    -- Contare record automatici in unified_attendances
    SELECT COUNT(*) INTO automatic_count FROM public.unified_attendances WHERE is_manual = false;
    
    -- Contare record manuali in unified_attendances
    SELECT COUNT(*) INTO manual_count FROM public.unified_attendances WHERE is_manual = true;
    
    -- Contare record in attendances
    SELECT COUNT(*) INTO attendances_count FROM public.attendances;
    
    -- Contare record in manual_attendances
    SELECT COUNT(*) INTO manual_attendances_count FROM public.manual_attendances;
    
    -- Log dei risultati finali
    RAISE NOTICE '=== VERIFICA FINALE PRIMA DEL CLEANUP ===';
    RAISE NOTICE 'Record in unified_attendances: %', unified_count;
    RAISE NOTICE 'Record automatici in unified_attendances: %', automatic_count;
    RAISE NOTICE 'Record manuali in unified_attendances: %', manual_count;
    RAISE NOTICE 'Record in attendances: %', attendances_count;
    RAISE NOTICE 'Record in manual_attendances: %', manual_attendances_count;
    
    -- Verificare che la migrazione sia corretta
    IF automatic_count = attendances_count AND manual_count = manual_attendances_count THEN
        RAISE NOTICE '✅ MIGRAZIONE VERIFICATA - Procedo con il cleanup';
    ELSE
        RAISE NOTICE '❌ ERRORE NELLA MIGRAZIONE - Interrompo il cleanup';
        RAISE EXCEPTION 'La migrazione non è completa. Verificare i dati prima di procedere.';
    END IF;
END $$;

-- 2. RIMUOVERE TRIGGER E FUNZIONI DELLA TABELLA unified_attendances
-- ============================================================================

-- Rimuovere trigger se esistono
DROP TRIGGER IF EXISTS trigger_update_unified_attendances_updated_at ON public.unified_attendances;

-- Rimuovere funzione se esiste
DROP FUNCTION IF EXISTS update_unified_attendances_updated_at();

-- 3. RIMUOVERE POLICY RLS DELLA TABELLA unified_attendances
-- ============================================================================

-- Rimuovere tutte le policy RLS
DROP POLICY IF EXISTS "Admins can view all unified attendances" ON public.unified_attendances;
DROP POLICY IF EXISTS "Users can view own unified attendances" ON public.unified_attendances;
DROP POLICY IF EXISTS "Admins can manage unified attendances" ON public.unified_attendances;
DROP POLICY IF EXISTS "Users can manage own unified attendances" ON public.unified_attendances;

-- 4. RIMUOVERE INDICI DELLA TABELLA unified_attendances
-- ============================================================================

-- Rimuovere indici se esistono
DROP INDEX IF EXISTS idx_unified_attendances_user_date;
DROP INDEX IF EXISTS idx_unified_attendances_date;

-- 5. RIMUOVERE LA VISTA TEMPORANEA
-- ============================================================================

-- Rimuovere la vista temporanea creata per compatibilità
DROP VIEW IF EXISTS public.unified_attendances_view;

-- 6. RIMUOVERE LA TABELLA unified_attendances
-- ============================================================================

-- IMPORTANTE: Questa operazione è irreversibile!
-- Verificare che tutto il codice React sia stato aggiornato prima di eseguire

-- Rimuovere la tabella
DROP TABLE IF EXISTS public.unified_attendances;

-- 7. VERIFICA FINALE
-- ============================================================================

DO $$
BEGIN
    -- Verificare che la tabella sia stata rimossa
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unified_attendances' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'La tabella unified_attendances esiste ancora!';
    ELSE
        RAISE NOTICE '✅ TABELLA unified_attendances RIMOSSA CON SUCCESSO';
    END IF;
    
    -- Verificare che le tabelle target esistano e abbiano dati
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendances' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'La tabella attendances non esiste!';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manual_attendances' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'La tabella manual_attendances non esiste!';
    END IF;
    
    RAISE NOTICE '✅ VERIFICA FINALE COMPLETATA';
    RAISE NOTICE 'Le tabelle attendances e manual_attendances sono operative';
    RAISE NOTICE 'La tabella unified_attendances è stata rimossa';
    RAISE NOTICE 'Il database è stato ottimizzato con successo!';
END $$;

-- 8. AGGIORNAMENTO STATISTICHE DEL DATABASE
-- ============================================================================

-- Aggiornare le statistiche per le tabelle rimanenti
ANALYZE public.attendances;
ANALYZE public.manual_attendances;

-- 9. NOTA FINALE
-- ============================================================================

RAISE NOTICE '=== CLEANUP COMPLETATO ===';
RAISE NOTICE 'Il database è stato ottimizzato con successo!';
RAISE NOTICE 'Presenze automatiche: tabella attendances';
RAISE NOTICE 'Presenze manuali: tabella manual_attendances';
RAISE NOTICE 'Tabella unified_attendances rimossa';
RAISE NOTICE 'Performance migliorate, ridondanza eliminata';
