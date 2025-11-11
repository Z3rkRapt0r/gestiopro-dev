-- ============================================================================
-- QUERY PER TESTARE MANUALMENTE IL CRON DI MONITORAGGIO PRESENZE
-- ============================================================================

-- 1. Esegui manualmente la funzione cron
SELECT public.attendance_monitor_cron();

-- 2. Verifica configurazione del cron job
SELECT
    jobname,
    schedule,
    command,
    active,
    nodename
FROM cron.job
WHERE jobname = 'attendance-monitor-cron';

-- 3. Verifica alert pendenti per oggi
SELECT
    aa.id,
    aa.alert_date,
    aa.alert_time,
    aa.expected_time,
    aa.email_sent_at,
    p.first_name,
    p.last_name,
    p.email
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
WHERE aa.alert_date = CURRENT_DATE
AND aa.email_sent_at IS NULL
ORDER BY aa.alert_time;

-- 4. Verifica tutti gli alert di oggi (inviati e non)
SELECT
    aa.id,
    aa.alert_date,
    aa.alert_time,
    aa.expected_time,
    aa.email_sent_at,
    p.first_name,
    p.last_name
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
WHERE aa.alert_date = CURRENT_DATE
ORDER BY aa.email_sent_at NULLS FIRST, aa.alert_time;

-- 5. Verifica configurazione Supabase in app_config
SELECT
    id,
    project_ref,
    CASE
        WHEN anon_key IS NOT NULL THEN '✅ Configurata'
        ELSE '❌ Mancante'
    END as anon_key_status,
    CASE
        WHEN service_role_key IS NOT NULL THEN '✅ Configurata'
        ELSE '❌ Mancante'
    END as service_role_key_status
FROM app_config
WHERE id = 1;

-- 6. Verifica storia delle esecuzioni del cron
SELECT
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'attendance-monitor-cron')
ORDER BY start_time DESC
LIMIT 10;
