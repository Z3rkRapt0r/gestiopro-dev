-- Rimuovi il cron job esistente
SELECT cron.unschedule('check-missing-attendance');

-- Verifica che sia stato rimosso (dovrebbe restituire 0 righe)
SELECT * FROM cron.job WHERE jobname = 'check-missing-attendance';

-- Opzionale: Rimuovi anche l'eventuale cron job interno
SELECT cron.unschedule('check-missing-attendance-internal');

-- Verifica tutti i cron job attivi
SELECT jobid, schedule, command, nodename, nodeport, database, username, active, jobname 
FROM cron.job;
