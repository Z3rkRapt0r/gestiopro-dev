-- =====================================================
-- SOLUZIONE RAPIDA: Rimuovi completamente il trigger
-- =====================================================

-- 1. Rimuovi il trigger problematico
DROP TRIGGER IF EXISTS sync_work_days_trigger ON employee_work_schedules;

-- 2. Rimuovi la funzione del trigger
DROP FUNCTION IF EXISTS sync_work_days_representations();

-- 3. Messaggio di conferma
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'TRIGGER RIMOSSO CON SUCCESSO!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Il trigger sync_work_days_trigger è stato rimosso.';
    RAISE NOTICE 'La funzione sync_work_days_representations è stata rimossa.';
    RAISE NOTICE 'Il sistema ora usa solo le colonne booleane.';
    RAISE NOTICE '=====================================================';
END $$;
