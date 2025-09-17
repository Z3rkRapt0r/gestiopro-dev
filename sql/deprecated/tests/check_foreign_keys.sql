-- =========================================
-- 🔗 VERIFICA FOREIGN KEY ATTENDANCE_ALERTS
-- =========================================

-- Verifica tutti i vincoli foreign key della tabella attendance_alerts
SELECT '🔗 Foreign keys tabella attendance_alerts:' as status;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'attendance_alerts';

-- Verifica se l'admin_id dell'errore esiste in profiles
SELECT '�� Admin ID dell''errore in profiles:' as status;
SELECT id, first_name, last_name, email, role
FROM profiles 
WHERE id = '45e354b6-9b9a-423a-a6af-c67982f7afa5';

-- Verifica se esiste in admin_settings
SELECT '⚙️ Admin ID dell''errore in admin_settings:' as status;
SELECT id, attendance_alert_enabled, sender_name, sender_email
FROM admin_settings 
WHERE id = '45e354b6-9b9a-423a-a6af-c67982f7afa5';

-- Mostra relazione tra admin_settings e profiles
SELECT '🔄 Relazione admin_settings ↔ profiles:' as status;
SELECT 
    a.id as admin_settings_id,
    p.id as profiles_id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    a.attendance_alert_enabled
FROM admin_settings a
LEFT JOIN profiles p ON a.id = p.id;

-- Trova admin abilitati che esistono in entrambe le tabelle
SELECT '✅ Admin validi (esistono in entrambe le tabelle):' as status;
SELECT 
    a.id,
    p.first_name,
    p.last_name,
    p.email,
    a.attendance_alert_enabled
FROM admin_settings a
JOIN profiles p ON a.id = p.id
WHERE a.attendance_alert_enabled = true
AND p.is_active = true;
