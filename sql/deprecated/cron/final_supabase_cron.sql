-- Rimuovi tutti i cron job esistenti
SELECT cron.unschedule('check-missing-attendance');
SELECT cron.unschedule('trigger-attendance-check');

-- Abilita l'estensione pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crea una funzione che inserisce direttamente i record di avviso
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
    
    IF admin_count = 0 THEN
        RETURN 'No admins with attendance alert enabled at ' || current_timestamp_val;
    END IF;
    
    -- Per ogni admin con controllo entrate abilitato
    FOR admin_record IN 
        SELECT admin_id, attendance_alert_delay_minutes
        FROM admin_settings 
        WHERE attendance_alert_enabled = true
    LOOP
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
            CONTINUE WHEN NOT is_working_day;
            
            -- Verifica se è in ferie o permesso
            SELECT COUNT(*) INTO leave_count
            FROM leave_requests 
            WHERE user_id = employee_record.id 
            AND status = 'approved'
            AND (
                (type = 'ferie' AND date_from <= current_date_str::date AND date_to >= current_date_str::date)
                OR (type = 'permesso' AND day = current_date_str::date)
            );
            
            CONTINUE WHEN leave_count > 0;
            
            -- Calcola se è il momento di inviare l'avviso
            alert_time := (current_date_str || ' ' || expected_start_time)::timestamp + 
                         (admin_record.attendance_alert_delay_minutes || ' minutes')::interval;
            
            -- Se non è ancora il momento, salta
            CONTINUE WHEN current_timestamp_val < alert_time;
            
            -- Verifica se ha già registrato l'entrata
            SELECT COUNT(*) INTO attendance_count
            FROM attendances 
            WHERE user_id = employee_record.id 
            AND date = current_date_str::date 
            AND check_in_time IS NOT NULL;
            
            CONTINUE WHEN attendance_count > 0;
            
            -- Verifica se abbiamo già inviato un avviso oggi
            SELECT COUNT(*) INTO alert_count
            FROM attendance_alerts 
            WHERE employee_id = employee_record.id 
            AND alert_date = current_date_str::date;
            
            CONTINUE WHEN alert_count > 0;
            
            -- Registra che dobbiamo inviare un avviso e triggera la funzione Edge
            INSERT INTO attendance_alerts (employee_id, admin_id, alert_date, alert_time, expected_time)
            VALUES (employee_record.id, admin_record.admin_id, current_date_str::date, current_time_str::time, expected_start_time);
            
            alerts_created := alerts_created + 1;
            
        END LOOP;
    END LOOP;
    
    -- Se sono stati creati avvisi, inserisci un trigger per la funzione Edge
    IF alerts_created > 0 THEN
        INSERT INTO attendance_check_triggers (trigger_date, trigger_time, status)
        VALUES (current_date_str::date, current_timestamp_val, 'pending')
        ON CONFLICT (trigger_date) DO UPDATE SET 
            trigger_time = EXCLUDED.trigger_time,
            status = 'pending';
    END IF;
    
    RETURN 'Scheduled ' || alerts_created || ' alerts at ' || current_timestamp_val;
END;
$$;

-- Configura il cron job semplice
SELECT cron.schedule(
    'schedule-attendance-alerts',
    '*/15 * * * *',
    'SELECT public.schedule_attendance_alerts();'
);

-- Verifica che il cron job sia stato creato
SELECT jobid, schedule, command, nodename, nodeport, database, username, active, jobname 
FROM cron.job 
WHERE jobname = 'schedule-attendance-alerts';
