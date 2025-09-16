-- ALTERNATIVA 1: Prova con estensione http
-- Abilita le estensioni necessarie
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Configura il cron job
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

-- ALTERNATIVA 2: Se l'estensione http non è disponibile
-- Usa questo approccio con una funzione PL/pgSQL personalizzata

-- Crea una funzione che gestisce il controllo direttamente nel database
CREATE OR REPLACE FUNCTION public.check_missing_attendance_internal()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb := '{"success": true, "results": []}'::jsonb;
    admin_record record;
    employee_record record;
    current_time_str text;
    current_date_str text;
    current_day_name text;
    is_working_day boolean;
    expected_start_time time;
    alert_time timestamp;
    current_timestamp timestamp := now();
BEGIN
    current_time_str := to_char(current_timestamp, 'HH24:MI');
    current_date_str := to_char(current_timestamp, 'YYYY-MM-DD');
    current_day_name := lower(to_char(current_timestamp, 'Day'));
    current_day_name := trim(current_day_name);
    
    -- Per ogni admin con controllo entrate abilitato
    FOR admin_record IN 
        SELECT admin_id, attendance_alert_delay_minutes
        FROM admin_settings 
        WHERE attendance_alert_enabled = true
    LOOP
        -- Per ogni dipendente attivo
        FOR employee_record IN
            SELECT p.id, p.first_name, p.last_name, p.email,
                   ews.work_days, ews.start_time,
                   ws.monday, ws.tuesday, ws.wednesday, ws.thursday, ws.friday, ws.saturday, ws.sunday,
                   COALESCE(ews.start_time, ws.start_time) as effective_start_time
            FROM profiles p
            LEFT JOIN employee_work_schedules ews ON p.id = ews.employee_id
            CROSS JOIN work_schedules ws
            WHERE p.role = 'employee' AND p.is_active = true
        LOOP
            -- Determina se è un giorno lavorativo
            is_working_day := false;
            
            IF employee_record.work_days IS NOT NULL THEN
                -- Usa orari personalizzati
                is_working_day := current_day_name = ANY(employee_record.work_days);
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
            END IF;
            
            -- Se non è un giorno lavorativo, salta
            CONTINUE WHEN NOT is_working_day;
            
            -- Verifica se è in ferie o permesso
            IF EXISTS (
                SELECT 1 FROM leave_requests 
                WHERE user_id = employee_record.id 
                AND status = 'approved'
                AND (
                    (type = 'ferie' AND date_from <= current_date_str::date AND date_to >= current_date_str::date)
                    OR (type = 'permesso' AND day = current_date_str::date)
                )
            ) THEN
                CONTINUE;
            END IF;
            
            -- Calcola se è il momento di inviare l'avviso
            expected_start_time := employee_record.effective_start_time;
            alert_time := (current_date_str || ' ' || expected_start_time)::timestamp + 
                         (admin_record.attendance_alert_delay_minutes || ' minutes')::interval;
            
            -- Se non è ancora il momento, salta
            CONTINUE WHEN current_timestamp < alert_time;
            
            -- Verifica se ha già registrato l'entrata
            IF EXISTS (
                SELECT 1 FROM attendances 
                WHERE user_id = employee_record.id 
                AND date = current_date_str::date 
                AND check_in_time IS NOT NULL
            ) THEN
                CONTINUE;
            END IF;
            
            -- Verifica se abbiamo già inviato un avviso oggi
            IF EXISTS (
                SELECT 1 FROM attendance_alerts 
                WHERE employee_id = employee_record.id 
                AND alert_date = current_date_str::date
            ) THEN
                CONTINUE;
            END IF;
            
            -- Registra l'avviso (la funzione Edge si occuperà dell'invio email)
            INSERT INTO attendance_alerts (employee_id, admin_id, alert_date, alert_time, expected_time)
            VALUES (employee_record.id, admin_record.admin_id, current_date_str::date, current_time_str::time, expected_start_time);
            
        END LOOP;
    END LOOP;
    
    RETURN result;
END;
$$;

-- Configura il cron job per chiamare la funzione interna
SELECT cron.schedule(
    'check-missing-attendance-internal',
    '*/15 * * * *',
    'SELECT public.check_missing_attendance_internal();'
);
