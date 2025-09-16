-- SCRIPT PER FORZARE L'ESECUZIONE DEL CRON JOB
-- Questo script forza l'esecuzione immediata del cron job per test

-- 1. Prima disabilita il cron job esistente
SELECT cron.unschedule('robusto-attendance-check');

-- 2. Crea un cron job che si esegue ogni minuto (per test)
SELECT cron.schedule(
    'test-robusto-attendance-check',
    '* * * * *',  -- Ogni minuto
    'SELECT public.robusto_attendance_check();'
);

-- 3. Verifica che sia stato creato
SELECT 
    '✅ Cron job di test creato:' as info,
    jobid, 
    schedule, 
    jobname,
    active,
    next_run
FROM cron.job 
WHERE jobname = 'test-robusto-attendance-check';

-- 4. Aspetta 2-3 minuti e poi controlla i log
-- (Esegui questo comando dopo aver aspettato)
SELECT 
    '📊 Log esecuzioni test:' as info,
    runid,
    jobid,
    status,
    return_message,
    start_time,
    end_time,
    EXTRACT(EPOCH FROM (end_time - start_time)) as durata_secondi
FROM cron.job_run_details 
WHERE jobname = 'test-robusto-attendance-check'
ORDER BY start_time DESC 
LIMIT 10;

-- 5. Dopo aver testato, rimuovi il cron job di test e ricrea quello normale
SELECT cron.unschedule('test-robusto-attendance-check');

-- 6. Ricrea il cron job normale (ogni 15 minuti)
SELECT cron.schedule(
    'robusto-attendance-check',
    '*/15 * * * *',
    'SELECT public.robusto_attendance_check();'
);

-- 7. Verifica che sia stato ricreato correttamente
SELECT 
    '✅ Cron job normale ricreato:' as info,
    jobid, 
    schedule, 
    jobname,
    active,
    next_run
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';


