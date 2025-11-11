-- ============================================================================
-- FIX SECURITY WARNINGS - Security Advisor
-- ============================================================================
-- Risolve i warning del Security Advisor aggiungendo SET search_path = public
-- a tutte le funzioni SECURITY DEFINER per prevenire attacchi di path hijacking
-- ============================================================================

-- 1. FIX: is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'administrator')
  );
END;
$$;

-- 2. FIX: has_automatic_overtime_for_date function
CREATE OR REPLACE FUNCTION public.has_automatic_overtime_for_date(
    p_user_id uuid,
    p_date date
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM overtime_records
        WHERE user_id = p_user_id
        AND date = p_date
        AND is_automatic = true
    );
END;
$$;

-- 3. FIX: get_blocked_overtime_dates function
CREATE OR REPLACE FUNCTION public.get_blocked_overtime_dates(
    p_user_id uuid,
    p_month integer,
    p_year integer
)
RETURNS TABLE(blocked_date date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT date as blocked_date
    FROM overtime_records
    WHERE user_id = p_user_id
    AND EXTRACT(MONTH FROM date) = p_month
    AND EXTRACT(YEAR FROM date) = p_year
    AND is_automatic = true;
END;
$$;

-- 4. FIX: calculate_automatic_overtime_checkin trigger function
CREATE OR REPLACE FUNCTION public.calculate_automatic_overtime_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expected_start time;
    tolerance_mins integer;
    actual_start time;
    delay_minutes integer;
    overtime_enabled boolean;
    overtime_tolerance integer;
    work_schedule record;
    employee_schedule record;
    day_name text;
BEGIN
    IF NEW.check_in_time IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT enable_auto_overtime_checkin, auto_overtime_tolerance_minutes
    INTO overtime_enabled, overtime_tolerance
    FROM admin_settings
    LIMIT 1;

    IF NOT COALESCE(overtime_enabled, false) THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1 FROM overtime_records
        WHERE user_id = NEW.user_id
        AND date = NEW.date
        AND is_automatic = true
    ) THEN
        RETURN NEW;
    END IF;

    CASE EXTRACT(DOW FROM NEW.date)
        WHEN 0 THEN day_name := 'sunday';
        WHEN 1 THEN day_name := 'monday';
        WHEN 2 THEN day_name := 'tuesday';
        WHEN 3 THEN day_name := 'wednesday';
        WHEN 4 THEN day_name := 'thursday';
        WHEN 5 THEN day_name := 'friday';
        WHEN 6 THEN day_name := 'saturday';
    END CASE;

    SELECT * INTO employee_schedule
    FROM employee_work_schedules
    WHERE employee_id = NEW.user_id;

    SELECT * INTO work_schedule
    FROM work_schedules
    LIMIT 1;

    IF employee_schedule.start_time IS NOT NULL THEN
        expected_start := employee_schedule.start_time;
        tolerance_mins := COALESCE(employee_schedule.tolerance_minutes, 0);
    ELSE
        expected_start := work_schedule.start_time;
        tolerance_mins := COALESCE(work_schedule.tolerance_minutes, 0);
    END IF;

    actual_start := NEW.check_in_time;
    delay_minutes := EXTRACT(EPOCH FROM (actual_start - expected_start))/60;

    IF delay_minutes > (tolerance_mins + COALESCE(overtime_tolerance, 15)) THEN
        INSERT INTO overtime_records (
            user_id,
            date,
            overtime_type,
            start_time,
            end_time,
            total_minutes,
            is_automatic,
            calculated_minutes,
            approval_status,
            reason
        ) VALUES (
            NEW.user_id,
            NEW.date,
            'straordinario',
            expected_start,
            actual_start,
            delay_minutes,
            true,
            delay_minutes,
            'approved',
            format('Ritardo entrata automatico: %s minuti oltre tolleranza (%s min)',
                   delay_minutes, tolerance_mins)
        );
    END IF;

    RETURN NEW;
END;
$$;

-- 5. FIX: attendance_monitor_cron function (già presente in sql/cron/attendance_monitor_cron.sql)
-- Questa funzione viene ricreata con SET search_path = public
CREATE OR REPLACE FUNCTION public.attendance_monitor_cron()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_timestamp_val timestamp := now();
    current_date_str text;
    current_day_name text;
    admin_count integer := 0;
    total_employees integer := 0;
    alerts_created integer := 0;
    pending_alerts integer := 0;
    edge_response text;
    result_message text;
    admin_record record;
    employee_record record;
    employee_name text;
    is_working_day boolean;
    expected_start_time time;
    alert_time timestamp;
    leave_count integer;
    attendance_count integer;
    alert_count integer;
    v_supabase_url text;
    v_service_role_key text;
BEGIN
    result_message := '';

    BEGIN
        current_date_str := to_char(current_timestamp_val, 'YYYY-MM-DD');

        CASE EXTRACT(DOW FROM current_timestamp_val)
            WHEN 0 THEN current_day_name := 'sunday';
            WHEN 1 THEN current_day_name := 'monday';
            WHEN 2 THEN current_day_name := 'tuesday';
            WHEN 3 THEN current_day_name := 'wednesday';
            WHEN 4 THEN current_day_name := 'thursday';
            WHEN 5 THEN current_day_name := 'friday';
            WHEN 6 THEN current_day_name := 'saturday';
        END CASE;

        RAISE NOTICE '[Attendance Monitor Cron] Inizio controllo presenze - Giorno: %, Data: %',
            current_day_name, current_date_str;

        SELECT COUNT(*) INTO admin_count
        FROM admin_settings
        WHERE attendance_alert_enabled = true;

        SELECT COUNT(*) INTO total_employees
        FROM profiles
        WHERE role = 'employee' AND is_active = true;

        RAISE NOTICE '[Attendance Monitor Cron] % amministratori abilitati, % dipendenti attivi',
            admin_count, total_employees;

        IF admin_count = 0 THEN
            result_message := 'Monitoraggio presenze disabilitato - Nessun amministratore con controllo abilitato';
            RETURN result_message;
        END IF;

        INSERT INTO attendance_check_triggers (trigger_date, status)
        VALUES (current_date_str::date, 'pending')
        ON CONFLICT (trigger_date) DO UPDATE SET
            status = 'pending',
            updated_at = now();

        FOR admin_record IN
            SELECT admin_id, attendance_alert_delay_minutes
            FROM admin_settings
            WHERE attendance_alert_enabled = true
        LOOP
            RAISE NOTICE '[Attendance Monitor Cron] Elaborazione admin % (ritardo: % minuti)',
                admin_record.admin_id, admin_record.attendance_alert_delay_minutes;

            FOR employee_record IN
                SELECT p.id, p.first_name, p.last_name, p.email,
                       ews.start_time as emp_start_time,
                       ews.work_monday, ews.work_tuesday, ews.work_wednesday, ews.work_thursday,
                       ews.work_friday, ews.work_saturday, ews.work_sunday,
                       ws.monday, ws.tuesday, ws.wednesday, ws.thursday,
                       ws.friday, ws.saturday, ws.sunday,
                       ws.start_time as company_start_time
                FROM profiles p
                LEFT JOIN employee_work_schedules ews ON p.id = ews.employee_id
                CROSS JOIN work_schedules ws
                WHERE p.role = 'employee' AND p.is_active = true
            LOOP
                employee_name := TRIM(COALESCE(employee_record.first_name, '') || ' ' || COALESCE(employee_record.last_name, ''));

                is_working_day := false;

                IF employee_record.emp_start_time IS NOT NULL THEN
                    CASE current_day_name
                        WHEN 'monday' THEN is_working_day := COALESCE(employee_record.work_monday, false);
                        WHEN 'tuesday' THEN is_working_day := COALESCE(employee_record.work_tuesday, false);
                        WHEN 'wednesday' THEN is_working_day := COALESCE(employee_record.work_wednesday, false);
                        WHEN 'thursday' THEN is_working_day := COALESCE(employee_record.work_thursday, false);
                        WHEN 'friday' THEN is_working_day := COALESCE(employee_record.work_friday, false);
                        WHEN 'saturday' THEN is_working_day := COALESCE(employee_record.work_saturday, false);
                        WHEN 'sunday' THEN is_working_day := COALESCE(employee_record.work_sunday, false);
                    END CASE;
                    expected_start_time := employee_record.emp_start_time;
                ELSE
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

                IF NOT is_working_day THEN
                    CONTINUE;
                END IF;

                SELECT COUNT(*) INTO leave_count
                FROM leave_requests
                WHERE user_id = employee_record.id
                AND status = 'approved'
                AND (
                    (type = 'ferie' AND date_from <= current_date_str::date AND date_to >= current_date_str::date)
                    OR (type = 'permesso' AND day = current_date_str::date)
                );

                IF leave_count > 0 THEN
                    RAISE NOTICE '[Attendance Monitor Cron] % è in ferie/permesso - saltato', employee_name;
                    CONTINUE;
                END IF;

                alert_time := (current_date_str || ' ' || expected_start_time)::timestamp +
                             (admin_record.attendance_alert_delay_minutes || ' minutes')::interval;

                IF current_timestamp_val < alert_time THEN
                    CONTINUE;
                END IF;

                SELECT COUNT(*) INTO attendance_count
                FROM attendances
                WHERE user_id = employee_record.id
                AND date = current_date_str::date
                AND check_in_time IS NOT NULL;

                IF attendance_count > 0 THEN
                    CONTINUE;
                END IF;

                SELECT COUNT(*) INTO alert_count
                FROM attendance_alerts
                WHERE employee_id = employee_record.id
                AND alert_date = current_date_str::date;

                IF alert_count > 0 THEN
                    CONTINUE;
                END IF;

                INSERT INTO attendance_alerts (
                    employee_id,
                    admin_id,
                    alert_date,
                    alert_time,
                    expected_time
                ) VALUES (
                    employee_record.id,
                    admin_record.admin_id,
                    current_date_str::date,
                    current_timestamp_val::time,
                    expected_start_time
                );

                alerts_created := alerts_created + 1;
                RAISE NOTICE '[Attendance Monitor Cron] Avviso creato per % (previsto: %, attuale: %)',
                    employee_name, expected_start_time, to_char(current_timestamp_val, 'HH24:MI');

            END LOOP;
        END LOOP;

        SELECT COUNT(*) INTO pending_alerts
        FROM attendance_alerts
        WHERE alert_date = current_date_str::date
        AND email_sent_at IS NULL;

        RAISE NOTICE '[Attendance Monitor Cron] Controllo completato: % nuovi avvisi, % totali pendenti',
            alerts_created, pending_alerts;

        IF pending_alerts > 0 THEN
            RAISE NOTICE '[Attendance Monitor Cron] Chiamata Edge Function attendance-monitor per % avvisi pendenti',
                pending_alerts;

            BEGIN
                SELECT project_ref, service_role_key
                INTO v_supabase_url, v_service_role_key
                FROM app_config
                WHERE id = 1;

                IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
                    RAISE WARNING '[Attendance Monitor Cron] Configurazione Supabase mancante!';
                    edge_response := 'ERRORE: Configurazione Supabase non trovata.';
                ELSE
                    SELECT content INTO edge_response
                    FROM http((
                        'POST',
                        v_supabase_url || '/functions/v1/attendance-monitor',
                        ARRAY[
                            http_header('Content-Type', 'application/json'),
                            http_header('Authorization', 'Bearer ' || v_service_role_key)
                        ],
                        'application/json',
                        '{}'
                    ));

                    RAISE NOTICE '[Attendance Monitor Cron] Risposta Edge Function: %', edge_response;
                    edge_response := COALESCE(edge_response, 'Risposta vuota dalla Edge Function');
                END IF;

            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '[Attendance Monitor Cron] Errore chiamata Edge Function: %', SQLERRM;
                edge_response := 'ERRORE: ' || SQLERRM;
            END;
        ELSE
            edge_response := 'Nessun nuovo avviso creato';
        END IF;

        result_message := format(
            'Monitoraggio presenze completato alle %s. Nuovi avvisi: %s | Totali pendenti: %s | Email: %s',
            to_char(current_timestamp_val, 'HH24:MI'),
            alerts_created,
            pending_alerts,
            edge_response
        );

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[Attendance Monitor Cron] Errore critico: %', SQLERRM;
        result_message := format('ERRORE alle %s: %s',
            to_char(current_timestamp_val, 'HH24:MI'),
            SQLERRM
        );
    END;

    RETURN COALESCE(result_message, 'Errore: messaggio risultato null');

END;
$$;
