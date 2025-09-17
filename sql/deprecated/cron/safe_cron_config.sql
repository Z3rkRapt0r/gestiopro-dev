-- =========================================
-- 🔧 CONFIGURAZIONE SICURA CRON (senza errori)
-- =========================================

-- Verifica configurazione attuale
SELECT '🔍 Controllo configurazione attuale...' as status;

-- Rimuovi SOLO i cron jobs che esistono (senza errori se non esistono)
DO $$
DECLARE
    job_record RECORD;
BEGIN
    -- Rimuovi eventuali job esistenti
    FOR job_record IN SELECT jobname FROM cron.job WHERE jobname IN ('check-missing-attendance', 'robusto-attendance-check') LOOP
        EXECUTE 'SELECT cron.unschedule(''' || job_record.jobname || ''');';
        RAISE NOTICE 'Rimosso cron job: %', job_record.jobname;
    END LOOP;
END $$;

-- Verifica che siano stati rimossi
SELECT 
    '🗑️ Cron jobs dopo rimozione:' as status,
    COALESCE(jobname, 'NESSUNO') as job_rimosso
FROM cron.job 
WHERE jobname IN ('check-missing-attendance', 'robusto-attendance-check');

-- Crea il nuovo cron job
SELECT cron.schedule(
    'robusto-attendance-check',
    '*/15 * * * *',  -- Ogni 15 minuti
    'SELECT public.robusto_attendance_check();'
);

-- Verifica la configurazione finale
SELECT 
    '✅ Configurazione finale:' as status,
    jobname,
    schedule,
    active,
    next_run
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';

-- Test immediato della funzione
SELECT 
    '🧪 Test funzione:' as status,
    public.robusto_attendance_check() as risultato_test;
