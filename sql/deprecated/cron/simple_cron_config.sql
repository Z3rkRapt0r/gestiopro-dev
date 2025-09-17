-- =========================================
-- ✅ CONFIGURAZIONE SEMPLICE E SICURA CRON
-- =========================================

-- Verifica configurazione attuale (solo colonne sicure)
SELECT '🔍 Cron jobs attuali:' as status;
SELECT jobid, jobname, schedule, active
FROM cron.job;

-- Rimuovi SOLO i cron jobs che esistono
DO $$
DECLARE
    job_record RECORD;
BEGIN
    FOR job_record IN SELECT jobname FROM cron.job WHERE jobname IN ('check-missing-attendance', 'robusto-attendance-check') LOOP
        EXECUTE 'SELECT cron.unschedule(''' || job_record.jobname || ''');';
        RAISE NOTICE 'Rimosso cron job: %', job_record.jobname;
    END LOOP;
END $$;

-- Verifica dopo rimozione
SELECT '🗑️ Dopo rimozione:' as status;
SELECT COALESCE(jobname, 'NESSUNO') as job_rimosso
FROM cron.job 
WHERE jobname IN ('check-missing-attendance', 'robusto-attendance-check');

-- Crea il nuovo cron job ogni 15 minuti
SELECT cron.schedule(
    'robusto-attendance-check',
    '*/15 * * * *',
    'SELECT public.robusto_attendance_check();'
);

-- Verifica configurazione finale
SELECT '✅ Nuovo cron creato:' as status;
SELECT jobid, jobname, schedule, active
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';

-- Test immediato (commenta se non vuoi testare ora)
-- SELECT '🧪 Test:' as status, public.robusto_attendance_check() as risultato;
