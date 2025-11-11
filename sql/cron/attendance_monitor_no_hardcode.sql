-- =====================================================
-- ATTENDANCE MONITOR - VERSIONE SENZA HARDCODE
-- =====================================================
-- Questa versione NON chiama direttamente l'Edge Function
-- ma si limita a creare i record in attendance_check_triggers
-- L'Edge Function verrà chiamata da uno scheduler esterno
-- =====================================================

-- Rimuovi il cron job esistente se presente
SELECT cron.unschedule('attendance-monitor-cron') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'attendance-monitor-cron'
);

-- Crea la funzione semplificata (senza chiamata HTTP)
CREATE OR REPLACE FUNCTION public.trigger_attendance_check()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_timestamp_val timestamp := now();
    current_date_str text;
    result_message text;
BEGIN
    current_date_str := to_char(current_timestamp_val, 'YYYY-MM-DD');
    
    RAISE NOTICE '[Attendance Monitor] Creazione trigger per data: %', current_date_str;
    
    -- Inserisci o aggiorna il trigger per oggi
    INSERT INTO public.attendance_check_triggers (
        trigger_date, 
        status, 
        execution_time
    )
    VALUES (
        current_date_str::date, 
        'pending',
        current_timestamp_val
    )
    ON CONFLICT (trigger_date) DO UPDATE SET
        status = 'pending',
        execution_time = current_timestamp_val;
    
    result_message := 'Trigger creato per ' || current_date_str || ' alle ' || current_timestamp_val;
    RAISE NOTICE '[Attendance Monitor] %', result_message;
    
    RETURN result_message;
END;
$$;

COMMENT ON FUNCTION public.trigger_attendance_check() IS 
  'Crea un trigger pending per il controllo presenze. L''Edge Function check-missing-attendance leggerà questo trigger.';

-- Programma il cron job per eseguire ogni 15 minuti durante l'orario lavorativo
-- Dalle 8:00 alle 18:00, dal lunedì al venerdì
SELECT cron.schedule(
    'attendance-monitor-cron',
    '*/15 8-18 * * 1-5',  -- Ogni 15 minuti, 8-18, lun-ven
    $$SELECT public.trigger_attendance_check();$$
);

COMMENT ON EXTENSION cron IS 'Cron job per creare trigger di controllo presenze';

-- Verifica che il cron sia stato creato
SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
WHERE jobname = 'attendance-monitor-cron';

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================
-- Questo script crea solo i "trigger" nel database.
-- Per completare il sistema, devi configurare uno scheduler
-- che chiami l'Edge Function check-missing-attendance.
--
-- Opzioni:
-- 1. Supabase Scheduled Functions (consigliato)
-- 2. Vercel Cron Jobs
-- 3. GitHub Actions con schedule
-- 4. Cron server esterno
--
-- L'Edge Function leggerà i trigger "pending" e farà il lavoro.
-- =====================================================


