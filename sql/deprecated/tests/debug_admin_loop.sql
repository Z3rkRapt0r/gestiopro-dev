-- =========================================
-- 🔍 DEBUG CICLO AMMINISTRATORI
-- =========================================

-- Verifica esattamente cosa seleziona il ciclo FOR
SELECT '🔄 Cosa seleziona il ciclo FOR admin:' as status;

-- Simula esattamente la query del ciclo FOR
SELECT id as admin_id, attendance_alert_delay_minutes, resend_api_key, sender_name, sender_email
FROM admin_settings
WHERE attendance_alert_enabled = true;

-- Verifica se ci sono valori NULL negli admin selezionati
SELECT '❓ Controllo valori NULL:' as status;
SELECT 
    COUNT(*) as total_admin,
    COUNT(CASE WHEN id IS NULL THEN 1 END) as admin_id_null,
    COUNT(CASE WHEN attendance_alert_delay_minutes IS NULL THEN 1 END) as delay_null,
    COUNT(CASE WHEN resend_api_key IS NULL THEN 1 END) as api_key_null
FROM admin_settings
WHERE attendance_alert_enabled = true;

-- Mostra dettagli di ogni admin abilitato
SELECT '📋 Dettagli admin abilitati:' as status;
SELECT 
    id,
    attendance_alert_enabled,
    attendance_alert_delay_minutes,
    CASE WHEN resend_api_key IS NOT NULL THEN 'Presente' ELSE 'NULL' END as api_key_status,
    sender_name,
    sender_email,
    created_at,
    updated_at
FROM admin_settings
WHERE attendance_alert_enabled = true;

-- Verifica se l'ID degli admin esiste anche in profiles
SELECT '🔗 Verifica foreign key profiles:' as status;
SELECT 
    a.id as admin_settings_id,
    p.id as profiles_id,
    p.first_name,
    p.last_name,
    p.email,
    p.role
FROM admin_settings a
LEFT JOIN profiles p ON a.id = p.id
WHERE a.attendance_alert_enabled = true;

-- Test diretto della funzione per vedere cosa succede
SELECT '🧪 Test chiamata diretta funzione:' as status;
SELECT public.robusto_attendance_check() as risultato;
