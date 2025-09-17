-- =========================================
-- 🔧 FIX ADMIN_SETTINGS MANCANTI
-- =========================================

-- 1. CREA RECORD ADMIN_SETTINGS MANCANTI per amministratori attivi
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
    true as attendance_alert_enabled, -- Abilitato di default
    30 as attendance_alert_delay_minutes, -- 30 minuti di ritardo
    NULL as resend_api_key, -- Da configurare manualmente
    p.first_name || ' ' || p.last_name as sender_name,
    NULL as sender_email, -- Da configurare manualmente
    NOW(),
    NOW()
FROM profiles p
LEFT JOIN admin_settings a ON p.id = a.id
WHERE p.role IN ('admin', 'super_admin') 
AND p.is_active = true 
AND a.id IS NULL;

-- Verifica quanti record sono stati creati
SELECT '✅ Record admin_settings creati:' as messaggio, COUNT(*) as creati
FROM admin_settings a
WHERE a.created_at >= NOW() - INTERVAL '1 minute';

-- 2. VERIFICA CHE TUTTI GLI AMMINISTRATORI ABBIANO IMPOSTAZIONI
SELECT '�� Amministratori con impostazioni:' as sezione;
SELECT p.first_name || ' ' || p.last_name as nome,
       CASE WHEN a.id IS NOT NULL THEN '✅ Ha impostazioni' ELSE '❌ Mancanti' END as stato,
       a.attendance_alert_enabled,
       a.resend_api_key IS NOT NULL as api_key_configurata,
       a.sender_email IS NOT NULL as email_configurata
FROM profiles p
LEFT JOIN admin_settings a ON p.id = a.id
WHERE p.role IN ('admin', 'super_admin') AND p.is_active = true;

-- 3. PULISCI AVVISI CON ADMIN_ID INESISTENTI (se presenti)
-- Prima vediamo quanti sono
SELECT '🚨 Avvisi con admin_id inesistenti PRIMA della pulizia:' as sezione;
SELECT COUNT(*) as avvisi_problematici
FROM attendance_alerts aa
LEFT JOIN admin_settings a ON aa.admin_id = a.id
WHERE aa.email_sent_at IS NULL AND a.id IS NULL;

-- Elimina avvisi con admin_id inesistenti
DELETE FROM attendance_alerts aa
WHERE aa.email_sent_at IS NULL 
AND NOT EXISTS (
    SELECT 1 FROM admin_settings a WHERE a.id = aa.admin_id
);

SELECT '🗑️ Avvisi con admin_id inesistenti eliminati:' as messaggio, COUNT(*) as eliminati
FROM (SELECT 1) as dummy_table
CROSS JOIN (SELECT COUNT(*) as cnt FROM attendance_alerts aa WHERE aa.email_sent_at IS NULL) as original_count
CROSS JOIN (SELECT COUNT(*) as cnt FROM attendance_alerts aa LEFT JOIN admin_settings a ON aa.admin_id = a.id WHERE aa.email_sent_at IS NULL AND a.id IS NOT NULL) as valid_count
WHERE original_count.cnt > valid_count.cnt;

-- 4. VERIFICA FINALE
SELECT '🎯 STATO FINALE:' as sezione;
SELECT 
    'Amministratori attivi' as tipo, COUNT(*) as totale
FROM profiles p
WHERE p.role IN ('admin', 'super_admin') AND p.is_active = true
UNION ALL
SELECT 
    'Record admin_settings' as tipo, COUNT(*) as totale
FROM admin_settings
UNION ALL
SELECT 
    'Avvisi pendenti validi' as tipo, COUNT(*) as totale
FROM attendance_alerts aa
JOIN admin_settings a ON aa.admin_id = a.id
WHERE aa.email_sent_at IS NULL;
