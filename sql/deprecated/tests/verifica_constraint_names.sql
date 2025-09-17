-- =========================================
-- 🔍 VERIFICA NOMI CONSTRAINT FOREIGN KEY
-- =========================================

-- Verifica i nomi esatti dei constraint nella tabella attendance_alerts
SELECT '🔗 Constraint names in attendance_alerts:' as status;
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

-- Test con i constraint names corretti
SELECT '🧪 Test query con constraint names corretti:' as status;
SELECT 
    aa.id,
    aa.employee_id,
    aa.admin_id,
    p.first_name,
    p.last_name,
    p.email,
    a.attendance_alert_enabled
FROM attendance_alerts aa
LEFT JOIN profiles p ON aa.employee_id = p.id
LEFT JOIN admin_settings a ON aa.admin_id = a.id
WHERE aa.alert_date = CURRENT_DATE 
AND aa.email_sent_at IS NULL
LIMIT 3;
