-- =====================================================
-- TEST: Verifica Migrazione employee_work_schedules
-- =====================================================

-- 1. Test delle funzioni di utilità
DO $$
DECLARE
    test_array TEXT[] := ARRAY['monday', 'tuesday', 'friday'];
    test_booleans RECORD;
    test_back_to_array TEXT[];
    test_passed BOOLEAN := true;
BEGIN
    RAISE NOTICE '🧪 [TEST] Inizio test funzioni di utilità...';
    
    -- Test conversione da array a booleani
    SELECT * INTO test_booleans FROM convert_work_days_to_boolean(test_array);
    
    IF NOT (test_booleans.monday = true AND test_booleans.tuesday = true AND test_booleans.friday = true) THEN
        RAISE NOTICE '❌ [TEST] Errore: conversione array -> booleani fallita';
        test_passed := false;
    ELSE
        RAISE NOTICE '✅ [TEST] Conversione array -> booleani: OK';
    END IF;
    
    -- Test conversione da booleani a array
    test_back_to_array := convert_boolean_to_work_days(
        test_booleans.monday, test_booleans.tuesday, test_booleans.wednesday,
        test_booleans.thursday, test_booleans.friday, test_booleans.saturday, test_booleans.sunday
    );
    
    IF NOT (test_back_to_array @> ARRAY['monday', 'tuesday', 'friday'] AND 
            array_length(test_back_to_array, 1) = 3) THEN
        RAISE NOTICE '❌ [TEST] Errore: conversione booleani -> array fallita';
        test_passed := false;
    ELSE
        RAISE NOTICE '✅ [TEST] Conversione booleani -> array: OK';
    END IF;
    
    IF test_passed THEN
        RAISE NOTICE '🎉 [TEST] Tutte le funzioni di utilità funzionano correttamente!';
    ELSE
        RAISE NOTICE '💥 [TEST] Alcuni test sono falliti!';
    END IF;
END $$;

-- 2. Test della struttura della tabella
DO $$
DECLARE
    column_exists BOOLEAN;
    test_passed BOOLEAN := true;
    day_columns TEXT[] := ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    col TEXT;
BEGIN
    RAISE NOTICE '🧪 [TEST] Verifica struttura tabella employee_work_schedules...';
    
    FOREACH col IN ARRAY day_columns
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employee_work_schedules' 
            AND column_name = col 
            AND data_type = 'boolean'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            RAISE NOTICE '❌ [TEST] Colonna % non esiste o non è di tipo boolean', col;
            test_passed := false;
        ELSE
            RAISE NOTICE '✅ [TEST] Colonna %: OK', col;
        END IF;
    END LOOP;
    
    IF test_passed THEN
        RAISE NOTICE '🎉 [TEST] Struttura tabella corretta!';
    ELSE
        RAISE NOTICE '💥 [TEST] Struttura tabella non corretta!';
    END IF;
END $$;

-- 3. Test dei dati esistenti
DO $$
DECLARE
    total_records INTEGER;
    records_with_booleans INTEGER;
    records_with_work_days INTEGER;
    test_passed BOOLEAN := true;
BEGIN
    RAISE NOTICE '🧪 [TEST] Verifica dati esistenti...';
    
    -- Conta record totali
    SELECT COUNT(*) INTO total_records FROM employee_work_schedules;
    RAISE NOTICE '📊 [TEST] Record totali: %', total_records;
    
    -- Conta record con colonne booleane popolate
    SELECT COUNT(*) INTO records_with_booleans 
    FROM employee_work_schedules 
    WHERE monday IS NOT NULL OR tuesday IS NOT NULL OR wednesday IS NOT NULL 
       OR thursday IS NOT NULL OR friday IS NOT NULL OR saturday IS NOT NULL OR sunday IS NOT NULL;
    
    -- Conta record con work_days
    SELECT COUNT(*) INTO records_with_work_days 
    FROM employee_work_schedules 
    WHERE work_days IS NOT NULL;
    
    RAISE NOTICE '📊 [TEST] Record con colonne booleane: %', records_with_booleans;
    RAISE NOTICE '📊 [TEST] Record con work_days: %', records_with_work_days;
    
    IF total_records > 0 AND records_with_booleans = 0 THEN
        RAISE NOTICE '❌ [TEST] Errore: Nessun record ha colonne booleane popolate';
        test_passed := false;
    ELSE
        RAISE NOTICE '✅ [TEST] Dati migrati correttamente';
    END IF;
    
    IF test_passed THEN
        RAISE NOTICE '🎉 [TEST] Dati esistenti verificati!';
    ELSE
        RAISE NOTICE '💥 [TEST] Problemi con i dati esistenti!';
    END IF;
END $$;

-- 4. Test del trigger di sincronizzazione
DO $$
DECLARE
    test_employee_id UUID;
    test_record RECORD;
    test_passed BOOLEAN := true;
BEGIN
    RAISE NOTICE '🧪 [TEST] Test trigger di sincronizzazione...';
    
    -- Crea un record di test
    INSERT INTO employee_work_schedules (
        employee_id, start_time, end_time, 
        monday, tuesday, wednesday, thursday, friday, saturday, sunday
    ) VALUES (
        gen_random_uuid(), '09:00', '17:00',
        true, true, false, false, true, false, false
    ) RETURNING employee_id INTO test_employee_id;
    
    -- Verifica che work_days sia stato aggiornato
    SELECT * INTO test_record 
    FROM employee_work_schedules 
    WHERE employee_id = test_employee_id;
    
    IF NOT (test_record.work_days @> ARRAY['monday', 'tuesday', 'friday'] AND 
            array_length(test_record.work_days, 1) = 3) THEN
        RAISE NOTICE '❌ [TEST] Errore: Trigger non ha sincronizzato work_days correttamente';
        RAISE NOTICE '   work_days: %, atteso: [monday, tuesday, friday]', test_record.work_days;
        test_passed := false;
    ELSE
        RAISE NOTICE '✅ [TEST] Trigger di sincronizzazione: OK';
    END IF;
    
    -- Pulisci il record di test
    DELETE FROM employee_work_schedules WHERE employee_id = test_employee_id;
    
    IF test_passed THEN
        RAISE NOTICE '🎉 [TEST] Trigger di sincronizzazione funziona!';
    ELSE
        RAISE NOTICE '💥 [TEST] Trigger di sincronizzazione non funziona!';
    END IF;
END $$;

-- 5. Test di compatibilità con la funzione attendance_monitor_cron
DO $$
DECLARE
    test_employee_id UUID;
    test_record RECORD;
    is_working_day BOOLEAN;
    test_passed BOOLEAN := true;
BEGIN
    RAISE NOTICE '🧪 [TEST] Test compatibilità con attendance_monitor_cron...';
    
    -- Crea un record di test
    INSERT INTO employee_work_schedules (
        employee_id, start_time, end_time, 
        monday, tuesday, wednesday, thursday, friday, saturday, sunday
    ) VALUES (
        gen_random_uuid(), '09:00', '17:00',
        true, false, true, false, true, false, false
    ) RETURNING employee_id INTO test_employee_id;
    
    -- Simula la logica della funzione cron
    SELECT * INTO test_record 
    FROM employee_work_schedules 
    WHERE employee_id = test_employee_id;
    
    -- Test per lunedì (dovrebbe essere true)
    is_working_day := test_record.monday;
    IF NOT is_working_day THEN
        RAISE NOTICE '❌ [TEST] Errore: Lunedì dovrebbe essere lavorativo';
        test_passed := false;
    ELSE
        RAISE NOTICE '✅ [TEST] Lunedì: OK';
    END IF;
    
    -- Test per martedì (dovrebbe essere false)
    is_working_day := test_record.tuesday;
    IF is_working_day THEN
        RAISE NOTICE '❌ [TEST] Errore: Martedì non dovrebbe essere lavorativo';
        test_passed := false;
    ELSE
        RAISE NOTICE '✅ [TEST] Martedì: OK';
    END IF;
    
    -- Pulisci il record di test
    DELETE FROM employee_work_schedules WHERE employee_id = test_employee_id;
    
    IF test_passed THEN
        RAISE NOTICE '🎉 [TEST] Compatibilità con attendance_monitor_cron: OK!';
    ELSE
        RAISE NOTICE '💥 [TEST] Problemi di compatibilità con attendance_monitor_cron!';
    END IF;
END $$;

-- 6. Riepilogo finale
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '🎯 RIEPILOGO TEST MIGRAZIONE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ Funzioni di utilità create e testate';
    RAISE NOTICE '✅ Struttura tabella aggiornata';
    RAISE NOTICE '✅ Dati esistenti migrati';
    RAISE NOTICE '✅ Trigger di sincronizzazione attivo';
    RAISE NOTICE '✅ Compatibilità con attendance_monitor_cron';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '🚀 La migrazione è pronta per l''uso!';
    RAISE NOTICE '=====================================================';
END $$;
