-- =========================================
-- 🔍 DEBUG SELEZIONE AMMINISTRATORI
-- =========================================

-- Verifica quali amministratori esistono e sono abilitati
SELECT '👥 Amministratori abilitati:' as status;
SELECT id, attendance_alert_enabled, attendance_alert_delay_minutes
FROM admin_settings 
WHERE attendance_alert_enabled = true;

-- Verifica se ci sono amministratori nella tabella profiles
SELECT '👤 Profili amministratori:' as status;
SELECT p.id, p.first_name, p.last_name, p.email, p.role
FROM profiles p
WHERE p.role IN ('admin', 'super_admin')
AND p.is_active = true;

-- Verifica foreign key nella tabella attendance_alerts
SELECT '🔗 Vincolo foreign key admin_id:' as status;
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='attendance_alerts'
    AND kcu.column_name='admin_id';

-- Test inserimento con ID admin valido
SELECT '🧪 Test inserimento con admin valido:' as status;
DO $$
DECLARE
    test_admin_id UUID;
    test_employee_id UUID;
BEGIN
    -- Prendi un admin valido
    SELECT id INTO test_admin_id 
    FROM admin_settings 
    WHERE attendance_alert_enabled = true 
    LIMIT 1;
    
    -- Prendi un employee valido
    SELECT id INTO test_employee_id 
    FROM profiles 
    WHERE role = 'employee' AND is_active = true 
    LIMIT 1;
    
    RAISE NOTICE 'Admin ID: %, Employee ID: %', test_admin_id, test_employee_id;
    
    IF test_admin_id IS NOT NULL AND test_employee_id IS NOT NULL THEN
        INSERT INTO attendance_alerts (employee_id, admin_id, alert_date, alert_time, expected_time)
        VALUES (test_employee_id, test_admin_id, CURRENT_DATE, CURRENT_TIME, '09:00:00'::TIME);
        
        RAISE NOTICE '✅ Test inserimento riuscito';
        
        -- Rimuovi il record di test
        DELETE FROM attendance_alerts 
        WHERE employee_id = test_employee_id 
        AND admin_id = test_admin_id 
        AND alert_date = CURRENT_DATE;
        
        RAISE NOTICE '🗑️ Record di test rimosso';
    ELSE
        RAISE NOTICE '❌ Admin o employee non trovato per il test';
    END IF;
END $$;
