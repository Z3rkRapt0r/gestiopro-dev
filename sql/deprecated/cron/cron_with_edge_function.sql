-- Rimuovi il cron job esistente
SELECT cron.unschedule('check-missing-attendance');

-- Abilita le estensioni necessarie
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Prova ad abilitare l'estensione http (potrebbe funzionare)
CREATE EXTENSION IF NOT EXISTS http;

-- Crea il cron job che chiama direttamente la funzione Edge
SELECT cron.schedule(
    'check-missing-attendance',
    '*/15 * * * *',
    $$
    SELECT extensions.http((
        'POST',
        'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
        ARRAY[extensions.http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTEyNzYsImV4cCI6MjA2NTQ2NzI3Nn0.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ'), extensions.http_header('Content-Type', 'application/json')],
        NULL,
        NULL
    )::extensions.http_request);
    $$
);

-- Verifica che il cron job sia stato creato
SELECT jobid, schedule, command, nodename, nodeport, database, username, active, jobname 
FROM cron.job 
WHERE jobname = 'check-missing-attendance';
