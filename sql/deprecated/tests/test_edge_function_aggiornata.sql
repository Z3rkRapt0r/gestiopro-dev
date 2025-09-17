-- =========================================
-- 🧪 TEST EDGE FUNCTION AGGIORNATA
-- =========================================

-- Test chiamata diretta alla Edge Function aggiornata
SELECT '🌐 Test Edge Function aggiornata:' as status;
SELECT status, content::json->>'messaggio' as messaggio,
       content::json->>'successo' as successo,
       content::json->>'avvisiProcessati' as avvisi_processati
FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
    ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg5MTI3NiwiZXhwIjoyMDY1NDY3Mjc2fQ.jbXMlI5J5sURH4oBLhm6bvTJa0G5ur_BEHNcedq4_co')
    ],
    'application/json',
    '{"test": "aggiornato"}'
));

-- Verifica se ci sono stati errori nella chiamata
SELECT '📊 Stato dopo test:' as status;
SELECT 
    COUNT(*) as avvisi_total_oggi,
    COUNT(CASE WHEN email_sent_at IS NULL THEN 1 END) as ancora_pendenti,
    COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as appena_inviati
FROM attendance_alerts 
WHERE alert_date = CURRENT_DATE;

-- Mostra avvisi inviati nell'ultimo minuto (per vedere se il test ha funzionato)
SELECT '📧 Avvisi inviati recentemente:' as status;
SELECT 
    aa.created_at,
    aa.email_sent_at,
    p.first_name || ' ' || p.last_name as dipendente,
    p.email,
    aa.expected_time
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
WHERE aa.alert_date = CURRENT_DATE 
AND aa.email_sent_at >= NOW() - INTERVAL '5 minutes'
ORDER BY aa.email_sent_at DESC;
