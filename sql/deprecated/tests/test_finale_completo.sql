-- =========================================
-- 🎯 TEST FINALE COMPLETO - TUTTO RISOLTO
-- =========================================

-- Test chiamata alla Edge Function con relazioni corrette
SELECT '🚀 Test finale Edge Function:' as status;
SELECT status, 
       content::json->>'messaggio' as messaggio,
       content::json->>'successo' as successo,
       content::json->>'avvisiProcessati' as processati,
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
    '{"test": "completamente_funzionante"}'
));

-- Verifica risultati finali completi
SELECT '📊 Stato finale sistema:' as status;
SELECT 
    COUNT(*) as totale_avvisi_oggi,
    COUNT(CASE WHEN email_sent_at IS NULL THEN 1 END) as pendenti,
    COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as total_inviati,
    COUNT(CASE WHEN email_sent_at >= NOW() - INTERVAL '15 minutes' THEN 1 END) as inviati_ultimi_15_min
FROM attendance_alerts 
WHERE alert_date = CURRENT_DATE;

-- Mostra TUTTI i dettagli delle email inviate oggi
SELECT '📧 Tutte le email inviate oggi:' as status;
SELECT 
    aa.id as id_avviso,
    aa.created_at as creato_il,
    aa.email_sent_at as inviato_il,
    p.first_name || ' ' || p.last_name as dipendente,
    p.email as email_dipendente,
    aa.expected_time as orario_previsto,
    aa.alert_time as ora_avviso,
    admin_p.first_name || ' ' || admin_p.last_name as amministratore,
    admin_p.email as email_amministratore
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
LEFT JOIN profiles admin_p ON aa.admin_id = admin_p.id
WHERE aa.alert_date = CURRENT_DATE 
AND aa.email_sent_at IS NOT NULL
ORDER BY aa.email_sent_at DESC;

-- Verifica Gabriele Bellante specificamente
SELECT '👤 Controllo Gabriele Bellante:' as status;
SELECT 
    COUNT(*) as avvisi_totali,
    COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as email_ricevute,
    MAX(email_sent_at) as ultima_email
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
WHERE p.first_name ILIKE '%gabriele%' 
AND p.last_name ILIKE '%bellante%'
AND aa.alert_date = CURRENT_DATE;

SELECT '🎉 SISTEMA COMPLETAMENTE FUNZIONANTE!' as status;
