-- SCRIPT PER CREARE UN AVVISO DI TEST
-- Questo script crea un avviso di test per verificare che l'Edge function funzioni

-- 1. Prima controlla se ci sono admin abilitati
SELECT 
    '⚙️ ADMIN DISPONIBILI:' as info,
    admin_id,
    attendance_alert_enabled,
    attendance_alert_delay_minutes
FROM admin_settings 
WHERE attendance_alert_enabled = true;

-- 2. Controlla i dipendenti disponibili
SELECT 
    '👥 DIPENDENTI DISPONIBILI:' as info,
    id,
    first_name,
    last_name,
    email
FROM profiles 
WHERE role = 'employee' AND is_active = true
LIMIT 5;

-- 3. Crea un avviso di test (se non esiste già)
INSERT INTO attendance_alerts (employee_id, admin_id, alert_date, alert_time, expected_time)
SELECT 
    p.id as employee_id,
    (SELECT admin_id FROM admin_settings WHERE attendance_alert_enabled = true LIMIT 1) as admin_id,
    CURRENT_DATE as alert_date,
    '10:30'::time as alert_time,
    '09:00'::time as expected_time
FROM profiles p
WHERE p.role = 'employee' AND p.is_active = true
LIMIT 1
ON CONFLICT (employee_id, alert_date) DO NOTHING;

-- 4. Verifica che l'avviso sia stato creato
SELECT 
    '📧 AVVISO DI TEST CREATO:' as info,
    aa.id,
    aa.alert_date,
    aa.alert_time,
    aa.expected_time,
    aa.email_sent_at,
    p.first_name || ' ' || p.last_name as employee_name,
    p.email as employee_email
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
WHERE aa.alert_date = CURRENT_DATE 
AND aa.email_sent_at IS NULL
ORDER BY aa.created_at DESC
LIMIT 1;

-- 5. Ora testa l'Edge function direttamente
SELECT 
    '🚀 TEST EDGE FUNCTION:' as info,
    content as risposta_edge_function
FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/send-attendance-alerts',
    ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTEyNzYsImV4cCI6MjA2NTQ2NzI3Nn0.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ')
    ],
    'application/json',
    '{}'
));

-- 6. Verifica se l'avviso è stato marcato come inviato
SELECT 
    '✅ AVVISO DOPO INVIO:' as info,
    aa.id,
    aa.alert_date,
    aa.alert_time,
    aa.expected_time,
    aa.email_sent_at,
    p.first_name || ' ' || p.last_name as employee_name
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
WHERE aa.alert_date = CURRENT_DATE 
ORDER BY aa.created_at DESC
LIMIT 1;


