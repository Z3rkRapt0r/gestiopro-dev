-- SCRIPT DI TEST PER IL CRON JOB
-- Esegui questi comandi nel Supabase SQL Editor per testare il sistema

-- 1. Verifica che il cron job sia attivo
SELECT 
    '📋 Status Cron Job:' as info,
    jobid, 
    schedule, 
    jobname,
    active,
    last_run,
    next_run
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';

-- 2. Testa la funzione manualmente
SELECT 
    '🧪 Test Funzione:' as info,
    public.robusto_attendance_check() as risultato;

-- 3. Controlla gli avvisi pendenti
SELECT 
    '📧 Avvisi Pendenti:' as info,
    COUNT(*) as total_pending
FROM attendance_alerts 
WHERE alert_date = CURRENT_DATE 
AND email_sent_at IS NULL;

-- 4. Mostra i dettagli degli avvisi pendenti
SELECT 
    '📋 Dettagli Avvisi:' as info,
    aa.id,
    aa.alert_date,
    aa.alert_time,
    aa.expected_time,
    aa.email_sent_at,
    p.first_name || ' ' || p.last_name as employee_name,
    p.email as employee_email
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
WHERE aa.alert_date = CURRENT_DATE 
AND aa.email_sent_at IS NULL
ORDER BY aa.alert_time;

-- 5. Controlla lo stato dei trigger
SELECT 
    '🔄 Trigger Status:' as info,
    trigger_date,
    status,
    created_at,
    updated_at
FROM attendance_check_triggers 
WHERE trigger_date = CURRENT_DATE;

-- 6. Verifica le impostazioni admin
SELECT 
    '⚙️ Impostazioni Admin:' as info,
    admin_id,
    attendance_alert_enabled,
    attendance_alert_delay_minutes
FROM admin_settings 
WHERE attendance_alert_enabled = true;

-- 7. Controlla i dipendenti attivi
SELECT 
    '👥 Dipendenti Attivi:' as info,
    COUNT(*) as total_employees
FROM profiles 
WHERE role = 'employee' AND is_active = true;

-- 8. Simula un dipendente senza entrata (per test)
-- Questo crea un avviso di test se hai un dipendente attivo
INSERT INTO attendance_alerts (employee_id, admin_id, alert_date, alert_time, expected_time)
SELECT 
    p.id as employee_id,
    (SELECT admin_id FROM admin_settings WHERE attendance_alert_enabled = true LIMIT 1) as admin_id,
    CURRENT_DATE as alert_date,
    '10:30'::time as alert_time,
    '09:00'::time as expected_time
FROM profiles p
WHERE p.role = 'employee' AND p.is_active = true
LIMIT 1
ON CONFLICT (employee_id, alert_date) DO NOTHING;

-- 9. Testa l'Edge function manualmente (simula quello che fa il cron)
SELECT 
    '🚀 Test Edge Function:' as info,
    content as risposta_edge_function
FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/send-attendance-alerts',
    ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTEyNzYsImV4cCI6MjA2NTQ2NzI3Nn0.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ')
    ],
    'application/json',
    '{}'
));

-- 10. Verifica i log del cron job (ultime esecuzioni)
SELECT 
    '📊 Log Cron Job:' as info,
    runid,
    jobid,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details 
WHERE jobname = 'robusto-attendance-check'
ORDER BY start_time DESC 
LIMIT 5;


