-- =========================================
-- 🔍 VERIFICA SCHEMA TABELLA ATTENDANCES
-- =========================================

-- Verifica quali colonne esistono nella tabella attendances
SELECT '📋 Schema tabella attendances:' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'attendances' 
ORDER BY ordinal_position;

-- Verifica alcuni record di esempio
SELECT '📊 Esempi di record in attendances:' as status;
SELECT * FROM attendances LIMIT 3;

-- Verifica se esistono colonne simili a employee_id
SELECT '🔍 Colonne che potrebbero riferirsi al dipendente:' as status;
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'attendances' 
AND (column_name ILIKE '%employee%' 
     OR column_name ILIKE '%user%' 
     OR column_name ILIKE '%profile%'
     OR column_name ILIKE '%id%');
