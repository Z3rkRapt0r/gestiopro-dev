-- =========================================
-- 🧪 TEST COMPLETO SISTEMA EMAIL
-- =========================================

-- PASSO 1: Applica funzione PostgreSQL se necessario
-- (Questo è opzionale, applicalo solo se non l'hai già fatto)

-- PASSO 2: Verifica configurazione attuale
SELECT '🔍 Configurazione sistema:' as status;
SELECT 
    (SELECT COUNT(*) FROM admin_settings WHERE attendance_alert_enabled = true) as admin_abilitati,
    (SELECT COUNT(*) FROM profiles WHERE role = 'employee' AND is_active = true) as dipendenti_attivi,
    (SELECT COUNT(*) FROM attendance_alerts WHERE alert_date = CURRENT_DATE AND email_sent_at IS NULL) as avvisi_pendenti;

-- PASSO 3: Test chiamata diretta Edge Function
SELECT '🌐 Test Edge Function:' as status;
SELECT status, content
FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
    ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg5MTI3NiwiZXhwIjoyMDY1NDY3Mjc2fQ.jbXMlI5J5sURH4oBLhm6bvTJa0G5ur_BEHNcedq4_co')
    ],
    'application/json',
    '{"test": "manuale"}'
));

-- PASSO 4: Verifica avvisi dopo il test
SELECT '📊 Avvisi dopo test:' as status;
SELECT COUNT(*) as avvisi_total,
       COUNT(CASE WHEN email_sent_at IS NULL THEN 1 END) as ancora_pendenti,
       COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as inviati
FROM attendance_alerts 
WHERE alert_date = CURRENT_DATE;

-- PASSO 5: Mostra avvisi inviati oggi
SELECT '📧 Avvisi inviati oggi:' as status;
SELECT 
    aa.created_at,
    p.first_name || ' ' || p.last_name as dipendente,
    p.email,
    aa.expected_time,
    aa.email_sent_at
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
WHERE aa.alert_date = CURRENT_DATE 
AND aa.email_sent_at IS NOT NULL
ORDER BY aa.email_sent_at DESC;
