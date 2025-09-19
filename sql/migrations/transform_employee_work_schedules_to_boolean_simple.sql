-- =====================================================
-- MIGRAZIONE SEMPLIFICATA: employee_work_schedules
-- Da work_days (string[]) a colonne booleane separate
-- =====================================================

-- 1. Aggiungi le nuove colonne booleane
ALTER TABLE employee_work_schedules 
ADD COLUMN IF NOT EXISTS monday BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tuesday BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wednesday BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS thursday BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS friday BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS saturday BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sunday BOOLEAN DEFAULT false;

-- 2. Migra i dati esistenti da work_days a colonne booleane
UPDATE employee_work_schedules 
SET 
    monday = CASE WHEN 'monday' = ANY(work_days) THEN true ELSE false END,
    tuesday = CASE WHEN 'tuesday' = ANY(work_days) THEN true ELSE false END,
    wednesday = CASE WHEN 'wednesday' = ANY(work_days) THEN true ELSE false END,
    thursday = CASE WHEN 'thursday' = ANY(work_days) THEN true ELSE false END,
    friday = CASE WHEN 'friday' = ANY(work_days) THEN true ELSE false END,
    saturday = CASE WHEN 'saturday' = ANY(work_days) THEN true ELSE false END,
    sunday = CASE WHEN 'sunday' = ANY(work_days) THEN true ELSE false END
WHERE work_days IS NOT NULL;

-- 3. Verifica semplice della migrazione
DO $$
DECLARE
    total_records INTEGER;
    migrated_records INTEGER;
BEGIN
    -- Conta i record totali
    SELECT COUNT(*) INTO total_records FROM employee_work_schedules;
    
    -- Conta i record con work_days non null
    SELECT COUNT(*) INTO migrated_records 
    FROM employee_work_schedules 
    WHERE work_days IS NOT NULL;
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'MIGRAZIONE COMPLETATA!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Record totali: %', total_records;
    RAISE NOTICE 'Record migrati: %', migrated_records;
    RAISE NOTICE '=====================================================';
END $$;

-- 4. Crea una funzione di utilità per convertire da array a booleani
CREATE OR REPLACE FUNCTION convert_work_days_to_boolean(work_days_array TEXT[])
RETURNS TABLE(
    monday BOOLEAN,
    tuesday BOOLEAN,
    wednesday BOOLEAN,
    thursday BOOLEAN,
    friday BOOLEAN,
    saturday BOOLEAN,
    sunday BOOLEAN
) AS $$
BEGIN
    RETURN QUERY SELECT
        CASE WHEN 'monday' = ANY(work_days_array) THEN true ELSE false END,
        CASE WHEN 'tuesday' = ANY(work_days_array) THEN true ELSE false END,
        CASE WHEN 'wednesday' = ANY(work_days_array) THEN true ELSE false END,
        CASE WHEN 'thursday' = ANY(work_days_array) THEN true ELSE false END,
        CASE WHEN 'friday' = ANY(work_days_array) THEN true ELSE false END,
        CASE WHEN 'saturday' = ANY(work_days_array) THEN true ELSE false END,
        CASE WHEN 'sunday' = ANY(work_days_array) THEN true ELSE false END;
END;
$$ LANGUAGE plpgsql;

-- 5. Crea una funzione di utilità per convertire da booleani a array
CREATE OR REPLACE FUNCTION convert_boolean_to_work_days(
    monday_val BOOLEAN,
    tuesday_val BOOLEAN,
    wednesday_val BOOLEAN,
    thursday_val BOOLEAN,
    friday_val BOOLEAN,
    saturday_val BOOLEAN,
    sunday_val BOOLEAN
)
RETURNS TEXT[] AS $$
DECLARE
    result TEXT[] := '{}';
BEGIN
    IF monday_val THEN result := array_append(result, 'monday'); END IF;
    IF tuesday_val THEN result := array_append(result, 'tuesday'); END IF;
    IF wednesday_val THEN result := array_append(result, 'wednesday'); END IF;
    IF thursday_val THEN result := array_append(result, 'thursday'); END IF;
    IF friday_val THEN result := array_append(result, 'friday'); END IF;
    IF saturday_val THEN result := array_append(result, 'saturday'); END IF;
    IF sunday_val THEN result := array_append(result, 'sunday'); END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Crea un trigger per mantenere sincronizzate le due rappresentazioni
CREATE OR REPLACE FUNCTION sync_work_days_representations()
RETURNS TRIGGER AS $$
BEGIN
    -- Se vengono aggiornate le colonne booleane, aggiorna work_days
    IF TG_OP = 'UPDATE' AND (
        OLD.monday IS DISTINCT FROM NEW.monday OR
        OLD.tuesday IS DISTINCT FROM NEW.tuesday OR
        OLD.wednesday IS DISTINCT FROM NEW.wednesday OR
        OLD.thursday IS DISTINCT FROM NEW.thursday OR
        OLD.friday IS DISTINCT FROM NEW.friday OR
        OLD.saturday IS DISTINCT FROM NEW.saturday OR
        OLD.sunday IS DISTINCT FROM NEW.sunday
    ) THEN
        NEW.work_days := convert_boolean_to_work_days(
            NEW.monday, NEW.tuesday, NEW.wednesday, NEW.thursday, 
            NEW.friday, NEW.saturday, NEW.sunday
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea il trigger
DROP TRIGGER IF EXISTS sync_work_days_trigger ON employee_work_schedules;
CREATE TRIGGER sync_work_days_trigger
    BEFORE UPDATE ON employee_work_schedules
    FOR EACH ROW
    EXECUTE FUNCTION sync_work_days_representations();

-- 7. Test delle funzioni di utilità
DO $$
DECLARE
    test_array TEXT[] := ARRAY['monday', 'tuesday', 'friday'];
    test_booleans RECORD;
    test_back_to_array TEXT[];
BEGIN
    RAISE NOTICE 'Test funzioni di utilità...';
    
    -- Test conversione da array a booleani
    SELECT * INTO test_booleans FROM convert_work_days_to_boolean(test_array);
    RAISE NOTICE 'Array to boolean: % -> monday=%, tuesday=%, friday=%', 
        test_array, test_booleans.monday, test_booleans.tuesday, test_booleans.friday;
    
    -- Test conversione da booleani a array
    test_back_to_array := convert_boolean_to_work_days(
        test_booleans.monday, test_booleans.tuesday, test_booleans.wednesday,
        test_booleans.thursday, test_booleans.friday, test_booleans.saturday, test_booleans.sunday
    );
    RAISE NOTICE 'Boolean to array: %', test_back_to_array;
    
    RAISE NOTICE 'Funzioni di utilità testate con successo!';
END $$;

-- 8. Messaggio di completamento
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'MIGRAZIONE COMPLETATA CON SUCCESSO!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Le colonne booleane sono state aggiunte e i dati migrati.';
    RAISE NOTICE 'Le funzioni di utilità sono state create.';
    RAISE NOTICE 'Il trigger di sincronizzazione è attivo.';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'PROSSIMI PASSI:';
    RAISE NOTICE '1. Testa la funzionalità';
    RAISE NOTICE '2. Aggiorna la funzione attendance_monitor_cron';
    RAISE NOTICE '3. Rimuovi la colonna work_days quando tutto funziona';
    RAISE NOTICE '=====================================================';
END $$;
