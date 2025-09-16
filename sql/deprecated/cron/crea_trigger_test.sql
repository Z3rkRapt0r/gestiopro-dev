-- SCRIPT PER CREARE UN TRIGGER DI TEST E TESTARE L'EDGE FUNCTION
-- Questo script crea un trigger per oggi e testa l'Edge function check-missing-attendance

-- 1. Crea un trigger per oggi (se non esiste)
INSERT INTO attendance_check_triggers (trigger_date, status)
VALUES (CURRENT_DATE, 'pending')
ON CONFLICT (trigger_date) DO UPDATE SET status = 'pending', updated_at = now();

-- 2. Verifica che il trigger sia stato creato
SELECT 
    '🔄 TRIGGER CREATO:' as info,
    trigger_date,
    status,
    created_at,
    updated_at
FROM attendance_check_triggers 
WHERE trigger_date = CURRENT_DATE;

-- 3. Testa l'Edge function check-missing-attendance
SELECT 
    '🚀 TEST EDGE FUNCTION check-missing-attendance:' as info,
    content as risposta_edge_function
FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
    ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTEyNzYsImV4cCI6MjA2NTQ2NzI3Nn0.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ')
    ],
    'application/json',
    '{}'
));

-- 4. Verifica lo stato del trigger dopo la chiamata
SELECT 
    '🔄 TRIGGER DOPO CHIAMATA:' as info,
    trigger_date,
    status,
    created_at,
    updated_at
FROM attendance_check_triggers 
WHERE trigger_date = CURRENT_DATE;

-- 5. Controlla se sono stati creati avvisi
SELECT 
    '📧 AVVISI CREATI:' as info,
    COUNT(*) as total_avvisi,
    COUNT(*) FILTER (WHERE email_sent_at IS NULL) as avvisi_pendenti,
    COUNT(*) FILTER (WHERE email_sent_at IS NOT NULL) as avvisi_inviati
FROM attendance_alerts 
WHERE alert_date = CURRENT_DATE;

-- 6. Mostra i dettagli degli avvisi creati
SELECT 
    '📋 DETTAGLI AVVISI:' as info,
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
ORDER BY aa.created_at DESC;


