-- =========================================
-- 🔍 DEBUG PROBLEMA EMAIL NON ARRIVATA
-- =========================================

-- 1. Verifica avvisi per Gabriele Bellante
SELECT '📧 Avvisi per Gabriele Bellante:' as status;
SELECT 
    aa.id,
    aa.employee_id,
    p.first_name || ' ' || p.last_name as employee_name,
    p.email as employee_email,
    aa.alert_date,
    aa.alert_time,
    aa.expected_time,
    aa.email_sent_at,
    aa.admin_id,
    admin_p.first_name || ' ' || admin_p.last_name as admin_name,
    admin_p.email as admin_email
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
LEFT JOIN profiles admin_p ON aa.admin_id = admin_p.id
WHERE p.first_name ILIKE '%gabriele%' AND p.last_name ILIKE '%bellante%'
ORDER BY aa.alert_date DESC, aa.created_at DESC;

-- 2. Verifica configurazione email admin
SELECT '⚙️ Configurazione email admin:' as status;
SELECT 
    a.id,
    p.first_name || ' ' || p.last_name as admin_name,
    p.email as admin_email,
    a.attendance_alert_enabled,
    a.resend_api_key IS NOT NULL as has_api_key,
    a.sender_name,
    a.sender_email,
    a.attendance_alert_delay_minutes
FROM admin_settings a
JOIN profiles p ON a.id = p.id
WHERE a.attendance_alert_enabled = true;

-- 3. Verifica avvisi pendenti oggi
SELECT '📬 Avvisi pendenti oggi:' as status;
SELECT COUNT(*) as avvisi_pendenti_total,
       COUNT(CASE WHEN email_sent_at IS NULL THEN 1 END) as non_inviati,
       COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as inviati
FROM attendance_alerts 
WHERE alert_date = CURRENT_DATE;

-- 4. Test chiamata diretta Edge Function
SELECT '🌐 Test chiamata diretta Edge Function:' as status;
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

-- 5. Verifica indirizzo email di Gabriele
SELECT '👤 Profilo Gabriele Bellante:' as status;
SELECT id, first_name, last_name, email, role, is_active
FROM profiles 
WHERE first_name ILIKE '%gabriele%' AND last_name ILIKE '%bellante%';
