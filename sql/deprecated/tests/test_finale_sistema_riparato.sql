-- =========================================
-- 🧪 TEST FINALE SISTEMA RIPARATO
-- =========================================

-- 1. FIX ADMIN_SETTINGS MANCANTI
INSERT INTO admin_settings (
    id, 
    attendance_alert_enabled, 
    attendance_alert_delay_minutes, 
    resend_api_key, 
    sender_name, 
    sender_email,
    created_at,
    updated_at
)
SELECT 
    p.id,
    true as attendance_alert_enabled,
    30 as attendance_alert_delay_minutes,
    NULL as resend_api_key,
    p.first_name || ' ' || p.last_name as sender_name,
    NULL as sender_email,
    NOW(),
    NOW()
FROM profiles p
LEFT JOIN admin_settings a ON p.id = a.id
WHERE p.role IN ('admin', 'super_admin') 
AND p.is_active = true 
AND a.id IS NULL;

-- 2. PULISCI AVVISI CON ADMIN_ID INESISTENTI
DELETE FROM attendance_alerts aa
WHERE aa.email_sent_at IS NULL 
AND NOT EXISTS (
    SELECT 1 FROM admin_settings a WHERE a.id = aa.admin_id
);

-- 3. VERIFICA RIPARAZIONE
SELECT '🔧 SISTEMA RIPARATO:' as sezione;
SELECT 
    '✅ Amministratori attivi' as componente, COUNT(*) as totale
FROM profiles p
WHERE p.role IN ('admin', 'super_admin') AND p.is_active = true
UNION ALL
SELECT 
    '✅ Record admin_settings' as componente, COUNT(*) as totale
FROM admin_settings
UNION ALL
SELECT 
    '✅ Avvisi pendenti validi' as componente, COUNT(*) as totale
FROM attendance_alerts aa
JOIN admin_settings a ON aa.admin_id = a.id
WHERE aa.email_sent_at IS NULL;

-- 4. TEST FUNZIONE POSTGRESQL
SELECT '⚙️ Test funzione PostgreSQL:' as sezione;
SELECT public.robusto_attendance_check() as creazione_avvisi;

-- 5. TEST INVIO EMAIL
SELECT '📧 Test invio email:' as sezione;
SELECT status, 
       content::json->>'messaggio' as messaggio,
       content::json->>'successo' as successo,
       content::json->>'riepilogo'->>'emailInviate' as email_inviate,
       content::json->>'riepilogo'->>'errori' as errori
FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/send-attendance-notifications',
    ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg5MTI3NiwiZXhwIjoyMDY1NDY3Mjc2fQ.jbXMlI5J5sURH4oBLhm6bvTJa0G5ur_BEHNcedq4_co')
    ],
    'application/json',
    '{"test": "sistema_riparato"}'
));

-- 6. RISULTATO FINALE
SELECT '🎯 RISULTATO FINALE:' as sezione;
SELECT 
    p.first_name || ' ' || p.last_name as dipendente,
    aa.alert_date,
    aa.email_sent_at IS NOT NULL as email_inviata,
    CASE WHEN aa.email_sent_at IS NOT NULL THEN '✅ EMAIL INVIATA' ELSE '⏳ IN ATTESA' END as stato
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
WHERE aa.alert_date = CURRENT_DATE
ORDER BY aa.created_at;
