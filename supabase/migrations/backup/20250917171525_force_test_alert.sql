
-- Forza creazione di un avviso di test per verificare il sistema
-- Questo simula una situazione in cui un dipendente non ha timbrato

-- Prima vediamo se ci sono dipendenti
DO 10738
DECLARE
    employee_record RECORD;
    admin_record RECORD;
    alert_time TIMESTAMP;
BEGIN
    -- Trova un dipendente attivo
    SELECT id, first_name, last_name INTO employee_record
    FROM profiles 
    WHERE role = 'employee' AND is_active = true 
    LIMIT 1;
    
    -- Trova un admin con monitoraggio abilitato
    SELECT admin_id, attendance_alert_delay_minutes INTO admin_record
    FROM admin_settings 
    WHERE attendance_alert_enabled = true 
    LIMIT 1;
    
    IF employee_record.id IS NOT NULL AND admin_record.admin_id IS NOT NULL THEN
        -- Calcola tempo limite (orario attuale - 5 minuti per forzare avviso)
        alert_time := CURRENT_TIMESTAMP - INTERVAL '5 minutes';
        
        -- Inserisci avviso di test
        INSERT INTO attendance_alerts (
            employee_id, 
            admin_id, 
            alert_date, 
            alert_time, 
            expected_time
        ) VALUES (
            employee_record.id,
            admin_record.admin_id,
            CURRENT_DATE,
            alert_time::TIME,
            '08:00:00'::TIME
        ) ON CONFLICT (employee_id, alert_date) DO NOTHING;
        
        RAISE NOTICE 'Avviso di test creato per dipendente: % % (ID: %)', 
            employee_record.first_name, employee_record.last_name, employee_record.id;
    ELSE
        RAISE NOTICE 'Impossibile creare avviso di test - dipendenti: %, admin: %', 
            CASE WHEN employee_record.id IS NOT NULL THEN 'OK' ELSE 'NESSUNO' END,
            CASE WHEN admin_record.admin_id IS NOT NULL THEN 'OK' ELSE 'NESSUNO' END;
    END IF;
END 10738;

-- Verifica se l'avviso è stato creato
SELECT 
    'Avviso Test Creato' as stato,
    COUNT(*) as totale,
    json_agg(json_build_object(
        'dipendente', p.first_name || ' ' || p.last_name,
        'orario_avviso', a.alert_time,
        'orario_previsto', a.expected_time,
        'email_inviata', CASE WHEN a.email_sent_at IS NOT NULL THEN 'SÌ' ELSE 'NO' END
    )) as dettagli
FROM attendance_alerts a
JOIN profiles p ON a.employee_id = p.id
WHERE a.alert_date = CURRENT_DATE AND a.email_sent_at IS NULL;

