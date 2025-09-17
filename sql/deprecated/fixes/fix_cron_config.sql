-- =========================================
-- 🔧 CORREZIONE CONFIGURAZIONE CRON
-- =========================================

-- Rimuovi eventuali cron jobs esistenti
SELECT cron.unschedule('check-missing-attendance');
SELECT cron.unschedule('robusto-attendance-check');

-- Configura il cron per chiamare la funzione PostgreSQL ogni 15 minuti
SELECT cron.schedule(
    'robusto-attendance-check',
    '*/15 * * * *',  -- Ogni 15 minuti
    'SELECT public.robusto_attendance_check();'
);

-- Verifica la configurazione
SELECT 
    '✅ Cron configurato correttamente:' as status,
    jobname,
    schedule,
    active
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';
