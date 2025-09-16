-- Abilita le estensioni necessarie
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Configura il cron job per controllare le entrate mancanti ogni 15 minuti
SELECT cron.schedule(
    'check-missing-attendance',
    '*/15 * * * *',
    $$
    SELECT http_post(
        'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
        '{}',
        'application/json',
        ARRAY[
            http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTEyNzYsImV4cCI6MjA2NTQ2NzI3Nn0.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ'),
            http_header('Content-Type', 'application/json')
        ]
    );
    $$
);
