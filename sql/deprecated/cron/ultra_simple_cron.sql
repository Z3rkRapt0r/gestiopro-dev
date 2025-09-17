-- =========================================
-- 🚀 CONFIGURAZIONE ULTRA SEMPLICE CRON
-- =========================================

-- PASSO 1: Rimozione sicura (uno alla volta, ignora errori)
SELECT '🗑️ Rimozione cron jobs esistenti...' as status;

-- Prova a rimuovere, ignora se non esistono
DO $$ BEGIN
    PERFORM cron.unschedule('check-missing-attendance');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'check-missing-attendance non esiste o già rimosso';
END $$;

DO $$ BEGIN
    PERFORM cron.unschedule('robusto-attendance-check');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'robusto-attendance-check non esiste o già rimosso';
END $$;

-- PASSO 2: Verifica rimozione
SELECT '🔍 Dopo rimozione:' as status;
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Tutti i cron jobs rimossi'
        ELSE '⚠️ Alcuni cron jobs ancora presenti: ' || string_agg(jobname, ', ')
    END as risultato
FROM cron.job 
WHERE jobname IN ('check-missing-attendance', 'robusto-attendance-check');

-- PASSO 3: Crea nuovo cron job
SELECT '➕ Creazione nuovo cron job...' as status;
SELECT cron.schedule(
    'robusto-attendance-check',
    '*/15 * * * *',
    'SELECT public.robusto_attendance_check();'
);

-- PASSO 4: Verifica creazione
SELECT '✅ Cron job creato:' as status;
SELECT jobid, jobname, schedule, active
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';

-- PASSO 5: Test opzionale (rimuovi commento per testare)
-- SELECT '🧪 TEST IMMEDIATO:' as status, public.robusto_attendance_check() as risultato;
