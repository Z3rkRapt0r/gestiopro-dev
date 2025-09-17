-- =========================================
-- 🔍 VERIFICA SCHEMA TABELLA LEAVE_REQUESTS
-- =========================================

-- Verifica quali colonne esistono nella tabella leave_requests
SELECT '📋 Schema tabella leave_requests:' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'leave_requests' 
ORDER BY ordinal_position;

-- Verifica alcuni record di esempio
SELECT '📊 Esempi di record in leave_requests:' as status;
SELECT * FROM leave_requests LIMIT 3;

-- Verifica se esistono colonne simili a employee_id
SELECT '🔍 Colonne che potrebbero riferirsi al dipendente:' as status;
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'leave_requests' 
AND (column_name ILIKE '%employee%' 
     OR column_name ILIKE '%user%' 
     OR column_name ILIKE '%profile%'
     OR column_name ILIKE '%id%');
