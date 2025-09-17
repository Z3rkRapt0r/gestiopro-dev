-- Verifica quali cron jobs sono attualmente attivi
SELECT 
    '📋 Cron jobs attualmente attivi:' as info,
    jobid,
    jobname,
    schedule,
    active,
    next_run,
    command
FROM cron.job
ORDER BY jobid;

-- Verifica le ultime esecuzioni
SELECT 
    '📈 Ultime esecuzioni del cron:' as info,
    jobname,
    last_run,
    next_run,
    status,
    return_message
FROM cron.job_run_details
ORDER BY last_run DESC
LIMIT 10;
