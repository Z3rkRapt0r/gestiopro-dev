-- =========================================
-- 🔄 RESET COMPLETO CRON JOB
-- =========================================

-- PASSO 1: Verifica cron jobs attuali
SELECT '🔍 Cron jobs attuali PRIMA della cancellazione:' as status;
SELECT jobid, jobname, schedule, active, database
FROM cron.job;

-- PASSO 2: CANCELLAZIONE FORZATA DI TUTTI I CRON JOBS
SELECT '🗑️ Cancellazione forzata di tutti i cron jobs...' as status;

-- Cancellazione sicura di ogni cron job esistente
DO $$
DECLARE
    job_record RECORD;
BEGIN
    FOR job_record IN SELECT jobname FROM cron.job LOOP
        EXECUTE 'SELECT cron.unschedule(''' || job_record.jobname || ''');';
        RAISE NOTICE 'Cancellato cron job: %', job_record.jobname;
    END LOOP;
END $$;

-- PASSO 3: Verifica cancellazione
SELECT '✅ Verifica cancellazione:' as status;
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ TUTTI I CRON JOBS CANCELLATI'
        ELSE '⚠️ Alcuni cron jobs rimasti: ' || string_agg(jobname, ', ')
    END as risultato_cancellazione
FROM cron.job;

-- PASSO 4: CREAZIONE CRON JOB COMPLETAMENTE NUOVO
SELECT '➕ Creazione cron job completamente nuovo...' as status;
SELECT cron.schedule(
    'robusto-attendance-check',
    '*/15 * * * *',  -- Ogni 15 minuti
    'SELECT public.robusto_attendance_check();'
);

-- PASSO 5: Verifica creazione
SELECT '🎯 Cron job creato:' as status;
SELECT jobid, jobname, schedule, active, database
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';

-- PASSO 6: Test immediato della funzione (opzionale)
-- SELECT '🧪 TEST IMMEDIATO:' as status, public.robusto_attendance_check() as risultato_test;

SELECT '🎉 RESET COMPLETATO! Nuovo cron job attivo ogni 15 minuti.' as status;
