-- Abilita l'estensione pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verifica che l'estensione sia stata abilitata
SELECT extname FROM pg_extension WHERE extname = 'pg_cron';

-- Configura il cron job per controllare le entrate mancanti ogni 15 minuti
-- Usa una funzione PL/pgSQL invece di chiamate HTTP esterne
SELECT cron.schedule(
    'check-missing-attendance',
    '*/15 * * * *',
    $$
    DO $$
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
    BEGIN
        current_time_str := to_char(current_timestamp_val, 'HH24:MI');
        current_date_str := to_char(current_timestamp_val, 'YYYY-MM-DD');
        
        -- Ottieni il nome del giorno corrente in inglese e minuscolo
        CASE EXTRACT(DOW FROM current_timestamp_val)
            WHEN 0 THEN current_day_name := 'sunday';
            WHEN 1 THEN current_day_name := 'monday';
            WHEN 2 THEN current_day_name := 'tuesday';
            WHEN 3 THEN current_day_name := 'wednesday';
            WHEN 4 THEN current_day_name := 'thursday';
            WHEN 5 THEN current_day_name := 'friday';
            WHEN 6 THEN current_day_name := 'saturday';
        END CASE;
        
        RAISE NOTICE 'Check Missing Attendance - Current time: %, day: %', current_time_str, current_day_name;
        
        -- Per ogni admin con controllo entrate abilitato
        FOR admin_record IN 
            SELECT admin_id, attendance_alert_delay_minutes
            FROM admin_settings 
            WHERE attendance_alert_enabled = true
        LOOP
            RAISE NOTICE 'Processing admin: %', admin_record.admin_id;
            
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
                RAISE NOTICE 'Checking employee: % (%)', employee_name, employee_record.id;
                
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
                    RAISE NOTICE 'Employee % not working today', employee_name;
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
                    RAISE NOTICE 'Employee % is on leave today', employee_name;
                    CONTINUE;
                END IF;
                
                -- Calcola se è il momento di inviare l'avviso
                alert_time := (current_date_str || ' ' || expected_start_time)::timestamp + 
                             (admin_record.attendance_alert_delay_minutes || ' minutes')::interval;
                
                -- Se non è ancora il momento, salta
                IF current_timestamp_val < alert_time THEN
                    RAISE NOTICE 'Too early to alert employee % (alert time: %)', employee_name, alert_time;
                    CONTINUE;
                END IF;
                
                -- Verifica se ha già registrato l'entrata
                SELECT COUNT(*) INTO attendance_count
                FROM attendances 
                WHERE user_id = employee_record.id 
                AND date = current_date_str::date 
                AND check_in_time IS NOT NULL;
                
                IF attendance_count > 0 THEN
                    RAISE NOTICE 'Employee % already checked in', employee_name;
                    CONTINUE;
                END IF;
                
                -- Verifica se abbiamo già inviato un avviso oggi
                SELECT COUNT(*) INTO alert_count
                FROM attendance_alerts 
                WHERE employee_id = employee_record.id 
                AND alert_date = current_date_str::date;
                
                IF alert_count > 0 THEN
                    RAISE NOTICE 'Alert already sent today for employee %', employee_name;
                    CONTINUE;
                END IF;
                
                -- Registra che dobbiamo inviare un avviso
                INSERT INTO attendance_alerts (employee_id, admin_id, alert_date, alert_time, expected_time)
                VALUES (employee_record.id, admin_record.admin_id, current_date_str::date, current_time_str::time, expected_start_time);
                
                RAISE NOTICE 'Alert scheduled for employee: % (expected: %, current: %)', employee_name, expected_start_time, current_time_str;
                
            END LOOP;
        END LOOP;
        
        -- Chiama la funzione Edge per inviare le email
        PERFORM net.http_post(
            url := 'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/send-attendance-alerts',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTEyNzYsImV4cCI6MjA2NTQ2NzI3Nn0.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ"}'::jsonb,
            body := '{}'::jsonb
        );
        
        RAISE NOTICE 'Check Missing Attendance completed at %', current_timestamp_val;
    END
    $$;
    $$
);

-- Verifica che il cron job sia stato creato
SELECT jobid, schedule, command, nodename, nodeport, database, username, active, jobname 
FROM cron.job 
WHERE jobname = 'check-missing-attendance';
