-- =====================================================
-- MIGRAZIONE: Trasformazione employee_work_schedules
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

-- 3. Verifica la migrazione dei dati
DO $$
DECLARE
    total_records INTEGER;
    migrated_records INTEGER;
    rec RECORD;
BEGIN
    -- Conta i record totali
    SELECT COUNT(*) INTO total_records FROM employee_work_schedules;
    
    -- Conta i record con work_days non null
    SELECT COUNT(*) INTO migrated_records 
    FROM employee_work_schedules 
    WHERE work_days IS NOT NULL;
    
    RAISE NOTICE 'Migrazione completata: % record totali, % record migrati', total_records, migrated_records;
    
    -- Mostra un esempio di migrazione
    RAISE NOTICE 'Esempio di migrazione:';
    FOR rec IN 
        SELECT employee_id, work_days, monday, tuesday, wednesday, thursday, friday, saturday, sunday
        FROM employee_work_schedules 
        WHERE work_days IS NOT NULL 
        LIMIT 3
    LOOP
        RAISE NOTICE 'Employee %: work_days=%, monday=%, tuesday=%, wednesday=%, thursday=%, friday=%, saturday=%, sunday=%', 
            rec.employee_id, rec.work_days, rec.monday, rec.tuesday, rec.wednesday, rec.thursday, rec.friday, rec.saturday, rec.sunday;
    END LOOP;
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

-- 6. Aggiorna la funzione attendance_monitor_cron per usare le nuove colonne
-- (Questa parte sarà aggiornata nel file principale della funzione)

-- 7. Commento: La colonna work_days può essere rimossa in un secondo momento
-- dopo aver verificato che tutto funzioni correttamente
-- ALTER TABLE employee_work_schedules DROP COLUMN work_days;

-- 8. Crea un trigger per mantenere sincronizzate le due rappresentazioni
-- (opzionale, per compatibilità temporanea)
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

-- 9. Test delle funzioni di utilità
DO $$
DECLARE
    test_array TEXT[] := ARRAY['monday', 'tuesday', 'friday'];
    test_booleans RECORD;
    test_back_to_array TEXT[];
BEGIN
    -- Test conversione da array a booleani
    SELECT * INTO test_booleans FROM convert_work_days_to_boolean(test_array);
    RAISE NOTICE 'Test array to boolean: % -> monday=%, tuesday=%, friday=%', 
        test_array, test_booleans.monday, test_booleans.tuesday, test_booleans.friday;
    
    -- Test conversione da booleani a array
    test_back_to_array := convert_boolean_to_work_days(
        test_booleans.monday, test_booleans.tuesday, test_booleans.wednesday,
        test_booleans.thursday, test_booleans.friday, test_booleans.saturday, test_booleans.sunday
    );
    RAISE NOTICE 'Test boolean to array: %', test_back_to_array;
END $$;

-- 10. Messaggio di completamento
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
    RAISE NOTICE '1. Aggiorna i tipi TypeScript';
    RAISE NOTICE '2. Aggiorna i componenti frontend';
    RAISE NOTICE '3. Testa la funzionalità';
    RAISE NOTICE '4. Rimuovi la colonna work_days quando tutto funziona';
    RAISE NOTICE '=====================================================';
END $$;
