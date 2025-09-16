-- Verifica la struttura della tabella admin_settings
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'admin_settings' 
AND column_name IN ('attendance_alert_enabled', 'attendance_alert_delay_minutes')
ORDER BY column_name;

-- Verifica il constraint sui template types
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'check_template_type';

-- Verifica la struttura della tabella email_templates
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'email_templates' 
AND column_name IN ('template_type', 'template_category')
ORDER BY column_name;

-- Verifica se la tabella attendance_alerts esiste
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'attendance_alerts';
