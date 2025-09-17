-- =========================================
-- 🧹 PULIZIA AVVISI ORFANI
-- =========================================

-- Mostra avvisi che puntano a amministratori non validi
SELECT '🔍 Avvisi orfani (admin senza impostazioni valide):' as status;
SELECT 
    aa.id,
    aa.employee_id,
    aa.admin_id,
    p.first_name || ' ' || p.last_name as dipendente,
    aa.alert_date,
    aa.email_sent_at,
    CASE 
        WHEN aa.email_sent_at IS NOT NULL THEN 'GIÀ INVIATO'
        ELSE 'NON INVIATO'
    END as stato
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
LEFT JOIN admin_settings a ON aa.admin_id = a.id
WHERE (a.id IS NULL OR a.attendance_alert_enabled = false)
AND aa.alert_date = CURRENT_DATE;

-- Conta quanti sono
SELECT '📊 Conteggio avvisi orfani:' as status;
SELECT 
    COUNT(*) as totale_avvisi_oggi,
    COUNT(CASE WHEN aa.email_sent_at IS NULL THEN 1 END) as non_inviati_da_pulire,
    COUNT(CASE WHEN aa.email_sent_at IS NOT NULL THEN 1 END) as gia_inviati
FROM attendance_alerts aa
LEFT JOIN admin_settings a ON aa.admin_id = a.id
WHERE (a.id IS NULL OR a.attendance_alert_enabled = false)
AND aa.alert_date = CURRENT_DATE;

-- PULIZIA: Rimuovi avvisi orfani NON ancora inviati
SELECT '🗑️ Rimozione avvisi orfani non inviati...' as status;
DELETE FROM attendance_alerts 
WHERE id IN (
    SELECT aa.id
    FROM attendance_alerts aa
    LEFT JOIN admin_settings a ON aa.admin_id = a.id
    WHERE (a.id IS NULL OR a.attendance_alert_enabled = false)
    AND aa.email_sent_at IS NULL
    AND aa.alert_date = CURRENT_DATE
);

-- Verifica pulizia
SELECT '✅ Dopo pulizia:' as status;
SELECT 
    COUNT(*) as avvisi_rimanenti_oggi,
    COUNT(CASE WHEN email_sent_at IS NULL THEN 1 END) as pendenti_validi,
    COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as gia_inviati
FROM attendance_alerts 
WHERE alert_date = CURRENT_DATE;

-- Mostra amministratori validi attuali
SELECT '👥 Amministratori validi:' as status;
SELECT 
    a.id,
    p.first_name || ' ' || p.last_name as nome,
    a.attendance_alert_enabled,
    a.resend_api_key IS NOT NULL as ha_api_key
FROM admin_settings a
JOIN profiles p ON a.id = p.id
WHERE a.attendance_alert_enabled = true
AND p.is_active = true
AND p.role IN ('admin', 'super_admin');
