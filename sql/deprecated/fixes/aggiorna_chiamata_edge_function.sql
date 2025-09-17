-- =========================================
-- 🔄 AGGIORNA CHIAMATA ALLA NUOVA EDGE FUNCTION
-- =========================================

-- Aggiorna la funzione PostgreSQL per chiamare send-attendance-notifications
UPDATE public.robusto_attendance_check()
SET chiamata_edge = 'send-attendance-notifications'
WHERE chiamata_edge = 'check-missing-attendance';

-- Verifica la funzione attuale
SELECT '📋 Controllo funzione PostgreSQL:' as sezione;
SELECT proname as nome_funzione, 
       pg_get_function_identity_arguments(oid) as argomenti
FROM pg_proc 
WHERE proname = 'robusto_attendance_check';

-- Test chiamata diretta della nuova Edge Function
SELECT '🌐 Test nuova Edge Function:' as status;
SELECT status, 
       content::json->>'messaggio' as messaggio,
       content::json->>'successo' as successo,
       content::json->>'riepilogo' as riepilogo
FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/send-attendance-notifications',
    ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg5MTI3NiwiZXhwIjoyMDY1NDY3Mjc2fQ.jbXMlI5J5sURH4oBLhm6bvTJa0G5ur_BEHNcedq4_co')
    ],
    'application/json',
    '{"test": "nuova_edge_function_funzionante"}'
));

-- Mostra avvisi pendenti attuali
SELECT '📧 Avvisi pendenti da processare:' as sezione;
SELECT 
    aa.id,
    p.first_name || ' ' || p.last_name as dipendente,
    aa.alert_date,
    aa.expected_time,
    aa.created_at
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
WHERE aa.alert_date = CURRENT_DATE 
AND aa.email_sent_at IS NULL
ORDER BY aa.created_at;
