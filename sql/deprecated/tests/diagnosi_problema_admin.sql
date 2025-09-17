-- =========================================
-- 🔍 DIAGNOSI PROBLEMA ADMIN_SETTINGS
-- =========================================

-- 1. Verifica amministratori attivi
SELECT '👥 Amministratori attivi:' as sezione;
SELECT p.id, p.first_name || ' ' || p.last_name as nome, p.role, p.is_active
FROM profiles p
WHERE p.role IN ('admin', 'super_admin') AND p.is_active = true;

-- 2. Verifica impostazioni admin esistenti
SELECT '⚙️ Impostazioni admin esistenti:' as sezione;
SELECT a.id, p.first_name || ' ' || p.last_name as nome, 
       a.attendance_alert_enabled, a.resend_api_key IS NOT NULL as api_key_presente
FROM admin_settings a
JOIN profiles p ON a.id = p.id;

-- 3. Confronta amministratori vs impostazioni
SELECT '📊 CONFRONTO AMMINISTRATORI:' as sezione;
SELECT 
    'Amministratori attivi' as tipo, COUNT(*) as conteggio
FROM profiles p
WHERE p.role IN ('admin', 'super_admin') AND p.is_active = true
UNION ALL
SELECT 
    'Record admin_settings' as tipo, COUNT(*) as conteggio
FROM admin_settings;

-- 4. Verifica avvisi con admin_id problematici
SELECT '🚨 AVVISI CON ADMIN_ID PROBLEMATICI:' as sezione;
SELECT aa.id, aa.employee_id, aa.admin_id, 
       p.first_name || ' ' || p.last_name as dipendente,
       CASE WHEN a.id IS NULL THEN '❌ ADMIN_ID NON ESISTE' ELSE '✅ OK' END as stato_admin,
       aa.created_at
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
LEFT JOIN admin_settings a ON aa.admin_id = a.id
WHERE aa.alert_date = CURRENT_DATE AND aa.email_sent_at IS NULL
ORDER BY aa.created_at;

-- 5. Trova amministratori senza record admin_settings
SELECT '❌ AMMINISTRATORI SENZA IMPOSTAZIONI:' as sezione;
SELECT p.id, p.first_name || ' ' || p.last_name as nome, p.role
FROM profiles p
LEFT JOIN admin_settings a ON p.id = a.id
WHERE p.role IN ('admin', 'super_admin') AND p.is_active = true AND a.id IS NULL;

-- 6. Trova amministratori con impostazioni incomplete
SELECT '⚠️ AMMINISTRATORI CON IMPOSTAZIONI INCOMPLETE:' as sezione;
SELECT p.first_name || ' ' || p.last_name as nome,
       a.attendance_alert_enabled,
       a.resend_api_key IS NOT NULL as api_key,
       a.sender_email IS NOT NULL as email_mittente
FROM admin_settings a
JOIN profiles p ON a.id = p.id
WHERE NOT a.attendance_alert_enabled OR a.resend_api_key IS NULL OR a.sender_email IS NULL;
