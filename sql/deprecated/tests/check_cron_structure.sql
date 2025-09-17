-- Verifica la struttura della tabella cron.job
SELECT 
    '📊 Struttura tabella cron.job:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'cron' 
  AND table_name = 'job'
ORDER BY ordinal_position;

-- Verifica anche cron.job_run_details
SELECT 
    '📈 Struttura tabella cron.job_run_details:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'cron' 
  AND table_name = 'job_run_details'
ORDER BY ordinal_position;
