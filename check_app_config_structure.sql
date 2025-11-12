-- Verifica struttura tabella app_config
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'app_config'
AND table_schema = 'public'
ORDER BY ordinal_position;
