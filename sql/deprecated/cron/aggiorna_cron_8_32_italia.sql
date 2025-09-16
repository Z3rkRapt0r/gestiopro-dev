-- AGGIORNA CRON JOB PER ESEGUIRE ALLE 8:32 ORA ITALIANA
-- Questo script aggiorna il cron job per eseguire alle 8:32 ora italiana

-- 1. Rimuovi il cron job esistente
SELECT cron.unschedule('robusto-attendance-check');

-- 2. Crea il nuovo cron job per le 8:32 ora italiana
-- 6:32 UTC = 8:32 ora italiana (CEST) / 7:32 ora italiana (CET)
SELECT cron.schedule(
    'robusto-attendance-check',
    '32 6 * * *',  -- 6:32 UTC = 8:32 ora italiana
    'SELECT public.robusto_attendance_check();'
);

-- 3. Verifica che il cron job sia stato creato correttamente
SELECT 
    '✅ Cron job aggiornato per 8:32 ora italiana' as info,
    jobid, 
    schedule, 
    jobname,
    active,
    next_run
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';

-- 4. Mostra quando sarà la prossima esecuzione
SELECT 
    '📅 Prossima esecuzione:' as info,
    next_run as timestamp_prossima_esecuzione,
    EXTRACT(HOUR FROM next_run) as ora_utc,
    EXTRACT(MINUTE FROM next_run) as minuto_utc,
    to_char(next_run, 'Day') as giorno_settimana,
    '⏰ Ora italiana: ' || to_char(next_run AT TIME ZONE 'Europe/Rome', 'HH24:MI') as ora_italiana
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';

-- 5. Mostra l'orario attuale in Italia
SELECT 
    '🇮🇹 Ora attuale in Italia:' as info,
    now() AT TIME ZONE 'Europe/Rome' as ora_italiana_attuale,
    now() as ora_utc_attuale;

-- 6. Calcola quando sarà la prossima esecuzione in ora italiana
SELECT 
    '⏰ Prossima esecuzione in ora italiana:' as info,
    next_run AT TIME ZONE 'Europe/Rome' as prossima_esecuzione_italiana
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';


