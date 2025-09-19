-- =====================================================
-- FIX: Errore trigger "record new has no field work_days"
-- =====================================================

-- 1. Rimuovi il trigger problematico
DROP TRIGGER IF EXISTS sync_work_days_trigger ON employee_work_schedules;

-- 2. Aggiorna la funzione del trigger per gestire work_days nullable
CREATE OR REPLACE FUNCTION sync_work_days_representations()
RETURNS TRIGGER AS $$
BEGIN
    -- Se vengono aggiornate le colonne booleane, aggiorna work_days solo se esiste
    IF TG_OP = 'UPDATE' AND (
        OLD.monday IS DISTINCT FROM NEW.monday OR
        OLD.tuesday IS DISTINCT FROM NEW.tuesday OR
        OLD.wednesday IS DISTINCT FROM NEW.wednesday OR
        OLD.thursday IS DISTINCT FROM NEW.thursday OR
        OLD.friday IS DISTINCT FROM NEW.friday OR
        OLD.saturday IS DISTINCT FROM NEW.saturday OR
        OLD.sunday IS DISTINCT FROM NEW.sunday
    ) THEN
        -- Aggiorna work_days solo se la colonna esiste e non è null
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employee_work_schedules' 
            AND column_name = 'work_days'
        ) THEN
            NEW.work_days := convert_boolean_to_work_days(
                NEW.monday, NEW.tuesday, NEW.wednesday, NEW.thursday, 
                NEW.friday, NEW.saturday, NEW.sunday
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Ricrea il trigger
CREATE TRIGGER sync_work_days_trigger
    BEFORE UPDATE ON employee_work_schedules
    FOR EACH ROW
    EXECUTE FUNCTION sync_work_days_representations();

-- 4. Alternativa: Rimuovi completamente il trigger se non necessario
-- (Decommentare se si vuole rimuovere completamente la sincronizzazione)
/*
DROP TRIGGER IF EXISTS sync_work_days_trigger ON employee_work_schedules;
DROP FUNCTION IF EXISTS sync_work_days_representations();
*/

-- 5. Verifica che le colonne booleane siano popolate correttamente
DO $$
DECLARE
    total_records INTEGER;
    records_with_booleans INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records FROM employee_work_schedules;
    
    SELECT COUNT(*) INTO records_with_booleans 
    FROM employee_work_schedules 
    WHERE monday IS NOT NULL OR tuesday IS NOT NULL OR wednesday IS NOT NULL 
       OR thursday IS NOT NULL OR friday IS NOT NULL OR saturday IS NOT NULL OR sunday IS NOT NULL;
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FIX APPLICATO CON SUCCESSO!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Record totali: %', total_records;
    RAISE NOTICE 'Record con colonne booleane: %', records_with_booleans;
    RAISE NOTICE 'Trigger aggiornato per gestire work_days nullable';
    RAISE NOTICE '=====================================================';
END $$;
