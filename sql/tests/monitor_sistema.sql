-- SCRIPT PER MONITORARE IL SISTEMA IN TEMPO REALE
-- Esegui questo script periodicamente per monitorare il funzionamento

-- Dashboard completo del sistema
SELECT 
    '🎯 DASHBOARD SISTEMA AVVISI PRESENZE' as titolo,
    now() as timestamp_check;

-- 1. Status del cron job
SELECT 
    '📋 CRON JOB STATUS' as sezione,
    CASE 
        WHEN active THEN '✅ ATTIVO'
        ELSE '❌ DISATTIVO'
    END as status,
    schedule as frequenza,
    next_run as prossima_esecuzione,
    last_run as ultima_esecuzione
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';

-- 2. Statistiche avvisi
SELECT 
    '📧 STATISTICHE AVVISI' as sezione,
    COUNT(*) FILTER (WHERE alert_date = CURRENT_DATE AND email_sent_at IS NULL) as avvisi_pendenti_oggi,
    COUNT(*) FILTER (WHERE alert_date = CURRENT_DATE AND email_sent_at IS NOT NULL) as avvisi_inviati_oggi,
    COUNT(*) FILTER (WHERE alert_date >= CURRENT_DATE - INTERVAL '7 days') as avvisi_ultima_settimana
FROM attendance_alerts;

-- 3. Configurazione admin
SELECT 
    '⚙️ CONFIGURAZIONE ADMIN' as sezione,
    COUNT(*) FILTER (WHERE attendance_alert_enabled = true) as admin_abilitati,
    COUNT(*) as admin_totali,
    AVG(attendance_alert_delay_minutes) as ritardo_medio_minuti
FROM admin_settings;

-- 4. Dipendenti monitorati
SELECT 
    '👥 DIPENDENTI MONITORATI' as sezione,
    COUNT(*) as dipendenti_attivi,
    COUNT(*) FILTER (WHERE work_days IS NOT NULL) as con_orari_personalizzati,
    COUNT(*) FILTER (WHERE work_days IS NULL) as con_orari_aziendali
FROM profiles p
LEFT JOIN employee_work_schedules ews ON p.id = ews.employee_id
WHERE p.role = 'employee' AND p.is_active = true;

-- 5. Ultime 5 esecuzioni del cron
SELECT 
    '📊 ULTIME ESECUZIONI CRON' as sezione,
    ROW_NUMBER() OVER (ORDER BY start_time DESC) as n,
    status,
    LEFT(return_message, 100) as messaggio,
    start_time,
    EXTRACT(EPOCH FROM (end_time - start_time))::integer as durata_sec
FROM cron.job_run_details 
WHERE jobname = 'robusto-attendance-check'
ORDER BY start_time DESC 
LIMIT 5;

-- 6. Avvisi pendenti dettagliati
SELECT 
    '📋 AVVISI PENDENTI DETTAGLIATI' as sezione,
    p.first_name || ' ' || p.last_name as dipendente,
    p.email,
    aa.alert_time,
    aa.expected_time,
    EXTRACT(EPOCH FROM (now() - (aa.alert_date + aa.alert_time)))::integer/60 as minuti_da_quando_dovrebbe_entrare
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
WHERE aa.alert_date = CURRENT_DATE 
AND aa.email_sent_at IS NULL
ORDER BY aa.alert_time;

-- 7. Trigger di oggi
SELECT 
    '🔄 TRIGGER OGGI' as sezione,
    status,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (now() - updated_at))::integer as secondi_da_ultimo_aggiornamento
FROM attendance_check_triggers 
WHERE trigger_date = CURRENT_DATE;

-- 8. Test connessione Edge function
SELECT 
    '🚀 TEST EDGE FUNCTION' as sezione,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM http((
                'GET',
                'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/send-attendance-alerts',
                ARRAY[http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTEyNzYsImV4cCI6MjA2NTQ2NzI3Nn0.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ')],
                'application/json',
                ''
            ))
        ) THEN '✅ CONNESSIONE OK'
        ELSE '❌ CONNESSIONE FALLITA'
    END as status_connessione;


