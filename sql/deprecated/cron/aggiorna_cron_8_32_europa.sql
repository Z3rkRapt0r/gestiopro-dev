-- AGGIORNA CRON JOB PER ESEGUIRE ALLE 8:32 OGNI GIORNO (FORMATO EUROPA)
-- Questo script aggiorna il cron job per eseguire una volta al giorno alle 8:32

-- 1. Rimuovi il cron job esistente
SELECT cron.unschedule('robusto-attendance-check');

-- 2. Crea il nuovo cron job per le 8:32 ogni giorno (formato Europa)
SELECT cron.schedule(
    'robusto-attendance-check',
    '32 8 * * *',  -- 8:32 ogni giorno (formato Europa)
    'SELECT public.robusto_attendance_check();'
);

-- 3. Verifica che il cron job sia stato creato correttamente
SELECT 
    '✅ Cron job aggiornato per 8:32 ogni giorno (formato Europa)' as info,
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
    EXTRACT(HOUR FROM next_run) as ora,
    EXTRACT(MINUTE FROM next_run) as minuto,
    to_char(next_run, 'Day') as giorno_settimana
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';

-- 5. Esempi di espressioni cron formato Europa:
-- 8:32 ogni giorno: 32 8 * * *
-- 8:32 solo giorni lavorativi (lun-ven): 32 8 * * 1-5
-- 8:32 solo lunedì: 32 8 * * 1
-- 8:32 solo venerdì: 32 8 * * 5
-- 8:32 solo weekend (sab-dom): 32 8 * * 6,7


