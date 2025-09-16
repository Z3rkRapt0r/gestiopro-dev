-- =========================================
-- 🚀 CRON MASTER - Configurazione Cron Job
-- =========================================
-- File master per tutte le configurazioni cron
-- Scegli l'opzione appropriata commentando/decommentando

-- Abilita le estensioni necessarie
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- =========================================
-- ⚙️ OPZIONE 1: ESECUZIONE OGNI 15 MINUTI
-- =========================================
-- Raccomandato per controllo presenze real-time

-- SELECT cron.schedule(
--     'check-missing-attendance',
--     '*/15 * * * *',  -- Ogni 15 minuti
--     $$
--     SELECT http_post(
--         'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
--         '{}',
--         'application/json',
--         ARRAY[
--             http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTEyNzYsImV4cCI6MjA2NTQ2NzI3Nn0.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ'),
--             http_header('Content-Type', 'application/json')
--         ]
--     );
--     $$
-- );

-- =========================================
-- 🕐 OPZIONE 2: ESECUZIONE GIORNALIERA 8:32 UTC
-- =========================================

-- SELECT cron.unschedule('robusto-attendance-check');
-- SELECT cron.schedule(
--     'robusto-attendance-check',
--     '32 8 * * *',  -- 8:32 UTC ogni giorno
--     'SELECT public.robusto_attendance_check();'
-- );

-- =========================================
-- 🇮🇹 OPZIONE 3: ESECUZIONE GIORNALIERA 8:32 ITALIA
-- =========================================

-- SELECT cron.unschedule('robusto-attendance-check');
-- SELECT cron.schedule(
--     'robusto-attendance-check',
--     '32 6 * * *',  -- 6:32 UTC = 8:32 Italia (CEST)
--     'SELECT public.robusto_attendance_check();'
-- );

-- =========================================
-- 🇪🇺 OPZIONE 4: ESECUZIONE GIORNALIERA 8:32 EUROPA
-- =========================================

-- SELECT cron.unschedule('robusto-attendance-check');
-- SELECT cron.schedule(
--     'robusto-attendance-check',
--     '32 7 * * *',  -- 7:32 UTC = 8:32 Europa Centrale
--     'SELECT public.robusto_attendance_check();'
-- );

-- =========================================
-- 🔧 GESTIONE CRON JOB
-- =========================================

-- Verifica cron jobs attivi
SELECT
    '📋 Cron jobs attivi:' as info,
    jobid,
    jobname,
    schedule,
    active,
    next_run
FROM cron.job
ORDER BY next_run;

-- Rimuovi cron job (se necessario)
-- SELECT cron.unschedule('check-missing-attendance');
-- SELECT cron.unschedule('robusto-attendance-check');

-- =========================================
-- 📊 MONITORAGGIO
-- =========================================

-- Conta trigger pendenti
SELECT
    '🎯 Trigger pendenti oggi:' as info,
    COUNT(*) as numero_trigger
FROM attendance_check_triggers
WHERE trigger_date = CURRENT_DATE
  AND status = 'pending';

-- Ultime esecuzioni del cron
SELECT
    '📈 Ultime esecuzioni:' as info,
    jobname,
    last_run,
    next_run,
    status
FROM cron.job_run_details
ORDER BY last_run DESC
LIMIT 5;

-- =========================================
-- 🆘 EMERGENCY COMMANDS
-- =========================================

-- Forza esecuzione immediata (per test)
-- SELECT public.robusto_attendance_check();

-- Forza esecuzione Edge Function (per test)
-- SELECT http_post(
--     'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
--     '{}',
--     'application/json',
--     ARRAY[
--         http_header('Authorization', 'Bearer YOUR_ANON_KEY'),
--         http_header('Content-Type', 'application/json')
--     ]
-- );

-- =========================================
-- 📝 NOTE IMPORTANTI
-- =========================================
--
-- 1. Scegli UNA sola opzione alla volta
-- 2. Commenta le altre opzioni con --
-- 3. Verifica il timezone corretto per la tua zona
-- 4. Testa sempre con SELECT prima di eseguire
-- 5. Monitora i log per verificare il funzionamento
--
-- TIMEZONES:
-- • Italia (estate): 6:32 UTC = 8:32 CEST
-- • Italia (inverno): 7:32 UTC = 8:32 CET
-- • Europa Centrale: 7:32 UTC = 8:32 CEST/CET
--
-- =========================================
