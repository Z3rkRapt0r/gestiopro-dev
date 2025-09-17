-- =========================================
-- 🔍 DEBUG COMPLETO DEL CRON JOB
-- =========================================

-- PASSO 1: Verifica configurazione cron attuale
SELECT '🔍 Configurazione cron attuale:' as status;
SELECT jobid, jobname, schedule, active, database
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';

-- PASSO 2: Test chiamata diretta alla funzione PostgreSQL
SELECT '🧪 Test chiamata diretta alla funzione:' as status;
SELECT public.robusto_attendance_check() as risultato_test;

-- PASSO 3: Verifica schema tabella attendance_alerts
SELECT '📋 Schema tabella attendance_alerts:' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'attendance_alerts' 
ORDER BY ordinal_position;

-- PASSO 4: Verifica dati nella tabella
SELECT '📊 Dati nella tabella attendance_alerts:' as status;
SELECT COUNT(*) as totale_record,
       COUNT(CASE WHEN email_sent_at IS NULL THEN 1 END) as avvisi_pendenti,
       COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as avvisi_inviati
FROM attendance_alerts;

-- PASSO 5: Verifica impostazioni amministratori
SELECT '👥 Impostazioni amministratori:' as status;
SELECT id, attendance_alert_enabled, attendance_alert_delay_minutes, resend_api_key IS NOT NULL as has_api_key
FROM admin_settings 
WHERE attendance_alert_enabled = true;

-- PASSO 6: Verifica dipendenti attivi
SELECT '👨‍💼 Dipendenti attivi:' as status;
SELECT COUNT(*) as dipendenti_attivi
FROM profiles 
WHERE role = 'employee' AND is_active = true;

-- PASSO 7: Test chiamata HTTP diretta all'Edge Function
SELECT '🌐 Test chiamata HTTP diretta all''Edge Function:' as status;
SELECT status, content
FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
    ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg5MTI3NiwiZXhwIjoyMDY1NDY3Mjc2fQ.jbXMlI5J5sURH4oBLhm6bvTJa0G5ur_BEHNcedq4_co')
    ],
    'application/json',
    '{"test": true}'
))
LIMIT 1;
