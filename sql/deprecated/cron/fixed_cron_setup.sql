-- Setup completo per il sistema di avvisi presenze
-- Questo script crea tutto il necessario per il controllo automatico delle entrate

-- Pulizia cron job esistenti
DO $$
BEGIN
    BEGIN
        PERFORM cron.unschedule('check-missing-attendance');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Cron job check-missing-attendance non esisteva';
    END;
    
    BEGIN
        PERFORM cron.unschedule('trigger-attendance-check');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Cron job trigger-attendance-check non esisteva';
    END;
    
    BEGIN
        PERFORM cron.unschedule('schedule-attendance-alerts');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Cron job schedule-attendance-alerts non esisteva';
    END;
END $$;

-- Abilita l'estensione pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verifica che l'estensione sia abilitata
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
        THEN '✅ pg_cron è abilitato'
        ELSE '❌ pg_cron NON è abilitato'
    END as status;

-- Crea la tabella per i trigger di controllo presenze (necessaria per la Edge function)
CREATE TABLE IF NOT EXISTS public.attendance_check_triggers (
  trigger_date DATE PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Abilita RLS per la tabella attendance_check_triggers
ALTER TABLE public.attendance_check_triggers ENABLE ROW LEVEL SECURITY;

-- Policy per permettere al sistema di gestire i trigger
CREATE POLICY "System can manage attendance check triggers" 
  ON public.attendance_check_triggers 
  FOR ALL 
  USING (true) WITH CHECK (true);

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare updated_at automaticamente
DROP TRIGGER IF EXISTS handle_updated_at ON public.attendance_check_triggers;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.attendance_check_triggers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Crea la funzione per schedulare gli avvisi
CREATE OR REPLACE FUNCTION public.schedule_attendance_alerts()
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
    admin_count integer := 0;
    total_employees integer := 0;
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
    
    -- Conta gli admin con controllo abilitato
    SELECT COUNT(*) INTO admin_count
    FROM admin_settings 
    WHERE attendance_alert_enabled = true;
    
    -- Conta i dipendenti totali
    SELECT COUNT(*) INTO total_employees
    FROM profiles 
    WHERE role = 'employee' AND is_active = true;
    
    RAISE NOTICE 'Starting attendance check: % admins enabled, % employees active, day: %', admin_count, total_employees, current_day_name;
    
    IF admin_count = 0 THEN
        RETURN 'No admins with attendance alert enabled at ' || current_timestamp_val;
    END IF;

    -- Inserisci o aggiorna il trigger per oggi
    INSERT INTO attendance_check_triggers (trigger_date, status)
    VALUES (current_date_str::date, 'pending')
    ON CONFLICT (trigger_date) DO UPDATE SET status = 'pending', updated_at = now();
    
    -- Per ogni admin con controllo entrate abilitato
    FOR admin_record IN 
        SELECT admin_id, attendance_alert_delay_minutes
        FROM admin_settings 
        WHERE attendance_alert_enabled = true
    LOOP
        RAISE NOTICE 'Processing admin: % (delay: % minutes)', admin_record.admin_id, admin_record.attendance_alert_delay_minutes;
        
        -- Per ogni dipendente attivo
        FOR employee_record IN
            SELECT p.id, p.first_name, p.last_name, p.email,
                   ews.work_days, ews.start_time as emp_start_time,
                   ws.monday, ws.tuesday, ws.wednesday, ws.thursday, ws.friday, ws.saturday, ws.sunday,
                   ws.start_time as company_start_time
            FROM profiles p
            LEFT JOIN employee_work_schedules ews ON p.id = ews.employee_id
            CROSS JOIN work_schedules ws
            WHERE p.role = 'employee' AND p.is_active = true
        LOOP
            employee_name := TRIM(COALESCE(employee_record.first_name, '') || ' ' || COALESCE(employee_record.last_name, ''));
            
            -- Determina se è un giorno lavorativo
            is_working_day := false;
            
            IF employee_record.work_days IS NOT NULL THEN
                -- Usa orari personalizzati
                is_working_day := current_day_name = ANY(employee_record.work_days);
                expected_start_time := employee_record.emp_start_time;
            ELSE
                -- Usa orari aziendali
                CASE current_day_name
                    WHEN 'monday' THEN is_working_day := employee_record.monday;
                    WHEN 'tuesday' THEN is_working_day := employee_record.tuesday;
                    WHEN 'wednesday' THEN is_working_day := employee_record.wednesday;
                    WHEN 'thursday' THEN is_working_day := employee_record.thursday;
                    WHEN 'friday' THEN is_working_day := employee_record.friday;
                    WHEN 'saturday' THEN is_working_day := employee_record.saturday;
                    WHEN 'sunday' THEN is_working_day := employee_record.sunday;
                END CASE;
                expected_start_time := employee_record.company_start_time;
            END IF;
            
            -- Se non è un giorno lavorativo, salta
            IF NOT is_working_day THEN
                CONTINUE;
            END IF;
            
            -- Verifica se è in ferie o permesso
            SELECT COUNT(*) INTO leave_count
            FROM leave_requests 
            WHERE user_id = employee_record.id 
            AND status = 'approved'
            AND (
                (type = 'ferie' AND date_from <= current_date_str::date AND date_to >= current_date_str::date)
                OR (type = 'permesso' AND day = current_date_str::date)
            );
            
            IF leave_count > 0 THEN
                CONTINUE;
            END IF;
            
            -- Calcola se è il momento di inviare l'avviso
            alert_time := (current_date_str || ' ' || expected_start_time)::timestamp + 
                         (admin_record.attendance_alert_delay_minutes || ' minutes')::interval;
            
            -- Se non è ancora il momento, salta
            IF current_timestamp_val < alert_time THEN
                CONTINUE;
            END IF;
            
            -- Verifica se ha già registrato l'entrata
            SELECT COUNT(*) INTO attendance_count
            FROM attendances 
            WHERE user_id = employee_record.id 
            AND date = current_date_str::date 
            AND check_in_time IS NOT NULL;
            
            IF attendance_count > 0 THEN
                CONTINUE;
            END IF;
            
            -- Verifica se abbiamo già inviato un avviso oggi
            SELECT COUNT(*) INTO alert_count
            FROM attendance_alerts 
            WHERE employee_id = employee_record.id 
            AND alert_date = current_date_str::date;
            
            IF alert_count > 0 THEN
                CONTINUE;
            END IF;
            
            -- Registra che dobbiamo inviare un avviso
            INSERT INTO attendance_alerts (employee_id, admin_id, alert_date, alert_time, expected_time)
            VALUES (employee_record.id, admin_record.admin_id, current_date_str::date, current_time_str::time, expected_start_time);
            
            alerts_created := alerts_created + 1;
            RAISE NOTICE 'Alert scheduled for employee: % (expected: %, current: %)', employee_name, expected_start_time, current_time_str;
            
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Attendance check completed: % alerts created', alerts_created;
    RETURN 'Check completed at ' || current_timestamp_val || '. Alerts created: ' || alerts_created;
END;
$$;

-- Configura il nuovo cron job
SELECT cron.schedule(
    'schedule-attendance-alerts',
    '*/15 * * * *',
    'SELECT public.schedule_attendance_alerts();'
);

-- Verifica che il cron job sia stato creato
SELECT 
    '✅ Cron job creato con successo' as status,
    jobid, 
    schedule, 
    jobname,
    active
FROM cron.job 
WHERE jobname = 'schedule-attendance-alerts';

-- Test immediato della funzione
SELECT public.schedule_attendance_alerts();
