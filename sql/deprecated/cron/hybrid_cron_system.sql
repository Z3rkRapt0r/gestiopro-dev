-- Rimuovi il cron job esistente
SELECT cron.unschedule('check-missing-attendance');

-- Abilita l'estensione pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crea una funzione che identifica i dipendenti e poi chiama la funzione Edge
CREATE OR REPLACE FUNCTION public.trigger_attendance_check()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_record record;
    employee_record record;
    current_time_str text;
    current_date_str text;
    current_day_name text;
    is_working_day boolean;
    expected_start_time time;
    alert_time timestamp;
    current_timestamp_val timestamp := now();
    employee_name text;
    leave_count integer;
    attendance_count integer;
    alert_count integer;
    alerts_created integer := 0;
    employees_to_check integer := 0;
BEGIN
    current_time_str := to_char(current_timestamp_val, 'HH24:MI');
    current_date_str := to_char(current_timestamp_val, 'YYYY-MM-DD');
    
    -- Ottieni il nome del giorno corrente
    CASE EXTRACT(DOW FROM current_timestamp_val)
        WHEN 0 THEN current_day_name := 'sunday';
        WHEN 1 THEN current_day_name := 'monday';
        WHEN 2 THEN current_day_name := 'tuesday';
        WHEN 3 THEN current_day_name := 'wednesday';
        WHEN 4 THEN current_day_name := 'thursday';
        WHEN 5 THEN current_day_name := 'friday';
        WHEN 6 THEN current_day_name := 'saturday';
    END CASE;
    
    -- Conta quanti admin hanno il controllo abilitato
    SELECT COUNT(*) INTO employees_to_check
    FROM admin_settings 
    WHERE attendance_alert_enabled = true;
    
    IF employees_to_check = 0 THEN
        RETURN 'No admins with attendance alert enabled at ' || current_timestamp_val;
    END IF;
    
    -- Inserisci un record di trigger per far sapere alla funzione Edge di attivarsi
    INSERT INTO attendance_check_triggers (trigger_time, status)
    VALUES (current_timestamp_val, 'pending')
    ON CONFLICT (trigger_date) DO UPDATE SET 
        trigger_time = EXCLUDED.trigger_time,
        status = 'pending';
    
    RETURN 'Attendance check triggered at ' || current_timestamp_val || ' for ' || employees_to_check || ' admin(s)';
END;
$$;

-- Crea una tabella per i trigger di controllo (semplice flag)
CREATE TABLE IF NOT EXISTS public.attendance_check_triggers (
    trigger_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    trigger_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS per la tabella trigger
ALTER TABLE public.attendance_check_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage attendance check triggers" 
  ON public.attendance_check_triggers 
  FOR ALL 
  USING (true);

-- Configura il cron job per triggerare il controllo ogni 15 minuti
SELECT cron.schedule(
    'trigger-attendance-check',
    '*/15 * * * *',
    'SELECT public.trigger_attendance_check();'
);

-- Verifica che il cron job sia stato creato
SELECT jobid, schedule, command, nodename, nodeport, database, username, active, jobname 
FROM cron.job 
WHERE jobname = 'trigger-attendance-check';
