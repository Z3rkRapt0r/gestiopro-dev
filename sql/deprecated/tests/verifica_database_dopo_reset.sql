-- =========================================
-- 🔍 VERIFICA DATABASE DOPO RESET
-- =========================================

-- 1. Tabelle esistenti
SELECT '📋 Tabelle esistenti nel database:' as sezione;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Verifica tabelle specifiche per il sistema presenze
SELECT '🏗️ Stato tabelle sistema presenze:' as sezione;
SELECT 
    'attendance_alerts' as tabella,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_alerts') THEN 'ESISTE' ELSE 'MANCANTE' END as stato
UNION ALL
SELECT 
    'admin_settings' as tabella,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_settings') THEN 'ESISTE' ELSE 'MANCANTE' END as stato
UNION ALL
SELECT 
    'attendance_check_triggers' as tabella,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_check_triggers') THEN 'ESISTE' ELSE 'MANCANTE' END as stato
UNION ALL
SELECT 
    'work_schedules' as tabella,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_schedules') THEN 'ESISTE' ELSE 'MANCANTE' END as stato
UNION ALL
SELECT 
    'employee_work_schedules' as tabella,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_work_schedules') THEN 'ESISTE' ELSE 'MANCANTE' END as stato;

-- 3. Verifica funzioni esistenti
SELECT '⚙️ Funzioni esistenti:' as sezione;
SELECT proname as nome_funzione
FROM pg_proc 
WHERE proname LIKE '%attendance%' OR proname LIKE '%check%';

-- 4. Verifica cron jobs
SELECT '⏰ Cron jobs esistenti:' as sezione;
SELECT jobname, schedule, active
FROM cron.job;

-- 5. Verifica Edge Functions
SELECT '🌐 Nota: Le Edge Functions vanno verificate nel dashboard Supabase' as sezione;
