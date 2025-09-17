-- =========================================
-- 🎯 TEST FINALE EDGE FUNCTION
-- =========================================

-- Test chiamata alla Edge Function semplificata
SELECT '🌐 Test Edge Function finale:' as status;
SELECT status, 
       content::json->>'messaggio' as messaggio,
       content::json->>'successo' as successo,
       content::json->>'avvisiProcessati' as avvisi_processati,
       content::json->>'inviati' as inviati,
       content::json->>'errori' as errori
FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
    ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg5MTI3NiwiZXhwIjoyMDY1NDY3Mjc2fQ.jbXMlI5J5sURH4oBLhm6bvTJa0G5ur_BEHNcedq4_co')
    ],
    'application/json',
    '{"test": "finale"}'
));

-- Verifica risultati finali
SELECT '📊 Risultati finali:' as status;
SELECT 
    COUNT(*) as avvisi_total_oggi,
    COUNT(CASE WHEN email_sent_at IS NULL THEN 1 END) as ancora_pendenti,
    COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as total_inviati,
    COUNT(CASE WHEN email_sent_at >= NOW() - INTERVAL '10 minutes' THEN 1 END) as inviati_ultimi_10_min
FROM attendance_alerts 
WHERE alert_date = CURRENT_DATE;

-- Mostra dettagli email inviate recentemente
SELECT '📧 Email inviate negli ultimi 10 minuti:' as status;
SELECT 
    aa.email_sent_at,
    p.first_name || ' ' || p.last_name as dipendente,
    p.email as email_destinatario,
    aa.expected_time,
    admin_p.first_name || ' ' || admin_p.last_name as amministratore
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
LEFT JOIN profiles admin_p ON aa.admin_id = admin_p.id
WHERE aa.alert_date = CURRENT_DATE 
AND aa.email_sent_at >= NOW() - INTERVAL '10 minutes'
ORDER BY aa.email_sent_at DESC;
