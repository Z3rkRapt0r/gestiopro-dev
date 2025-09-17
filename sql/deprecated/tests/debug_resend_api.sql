-- =========================================
-- 🔍 DEBUG RESEND API - PERCHÉ NON INVIA EMAIL
-- =========================================

-- 1. Verifica impostazioni amministratore
SELECT '⚙️ Impostazioni amministratore:' as status;
SELECT 
    a.id,
    p.first_name || ' ' || p.last_name as nome,
    a.attendance_alert_enabled,
    CASE WHEN a.resend_api_key IS NOT NULL AND length(trim(a.resend_api_key)) > 10 THEN 'API KEY PRESENTE' ELSE 'API KEY MANCANTE' END as stato_api_key,
    a.sender_name,
    a.sender_email
FROM admin_settings a
JOIN profiles p ON a.id = p.id
WHERE a.attendance_alert_enabled = true;

-- 2. Verifica avvisi pendenti attuali
SELECT '📧 Avvisi pendenti attuali:' as status;
SELECT 
    aa.id,
    p.first_name || ' ' || p.last_name as dipendente,
    p.email as email_dipendente,
    aa.expected_time,
    aa.admin_id,
    admin_p.first_name || ' ' || admin_p.last_name as amministratore
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
LEFT JOIN profiles admin_p ON aa.admin_id = admin_p.id
WHERE aa.alert_date = CURRENT_DATE 
AND aa.email_sent_at IS NULL;

-- 3. Test chiamata diretta Resend API (se abbiamo la chiave)
SELECT '🌐 Test diretto Resend API:' as status;
DO $$
DECLARE
    api_key TEXT;
    test_email TEXT := 'test@example.com';
BEGIN
    -- Prendi la prima API key disponibile
    SELECT resend_api_key INTO api_key 
    FROM admin_settings 
    WHERE attendance_alert_enabled = true 
    AND resend_api_key IS NOT NULL 
    LIMIT 1;
    
    IF api_key IS NOT NULL THEN
        RAISE NOTICE 'Testando API key: %...', left(api_key, 10);
        
        -- Test chiamata HTTP a Resend
        SELECT status, content
        FROM http((
            'POST',
            'https://api.resend.com/emails',
            ARRAY[
                http_header('Authorization', 'Bearer ' || api_key),
                http_header('Content-Type', 'application/json')
            ],
            'application/json',
            json_build_object(
                'from', 'Test <test@example.com>',
                'to', json_build_array(test_email),
                'subject', 'Test invio email',
                'html', '<h1>Test</h1><p>Email di test dal sistema</p>',
                'text', 'Test Email di test dal sistema'
            )::text
        ));
    ELSE
        RAISE NOTICE 'Nessuna API key valida trovata per il test';
    END IF;
END $$;

-- 4. Test chiamata Edge Function con debug
SELECT '🚀 Test Edge Function con debug:' as status;
SELECT status, 
       content::json->>'messaggio' as messaggio,
       content::json->>'successo' as successo,
       content::json->>'inviati' as inviati,
       content::json->>'errori' as errori,
       content::json->>'risultati' as dettagli_risultati
FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
    ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg5MTI3NiwiZXhwIjoyMDY1NDY3Mjc2fQ.jbXMlI5J5sURH4oBLhm6bvTJa0G5ur_BEHNcedq4_co')
    ],
    'application/json',
    '{"debug": true, "test": "resend_debug"}'
));

-- 5. Verifica se gli avvisi sono stati marcati come inviati nonostante l'errore
SELECT '📊 Stato avvisi dopo test:' as status;
SELECT 
    COUNT(*) as totale_oggi,
    COUNT(CASE WHEN email_sent_at IS NULL THEN 1 END) as ancora_pendenti,
    COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as marcati_inviati,
    MAX(email_sent_at) as ultimo_invio
FROM attendance_alerts 
WHERE alert_date = CURRENT_DATE;
