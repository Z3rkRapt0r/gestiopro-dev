-- ============================================================================
-- FIX WORK_DAYS COLUMN REFERENCE IN ATTENDANCE MONITOR CRON
-- ============================================================================
-- Fixes "column ews.work_days does not exist" error by using the correct
-- boolean columns (work_monday, work_tuesday, etc.) instead of work_days array
-- ============================================================================

CREATE OR REPLACE FUNCTION public.attendance_monitor_cron()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
BEGIN
    result_message := '';

    BEGIN
        -- Ottieni data e giorno corrente
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

        -- Conta amministratori con monitoraggio abilitato
        SELECT COUNT(*) INTO admin_count
        FROM public.admin_settings
        WHERE attendance_alert_enabled = true;

        -- Conta dipendenti attivi
        SELECT COUNT(*) INTO total_employees
        FROM public.profiles
        WHERE role = 'employee' AND is_active = true;

        RAISE NOTICE '[Attendance Monitor Cron] % amministratori abilitati, % dipendenti attivi',
            admin_count, total_employees;

        IF admin_count = 0 THEN
            result_message := 'Monitoraggio presenze disabilitato - Nessun amministratore con controllo abilitato';
            RETURN result_message;
        END IF;

        -- Inserisci/aggiorna trigger per oggi
        INSERT INTO public.attendance_check_triggers (trigger_date, status)
        VALUES (current_date_str::date, 'pending')
        ON CONFLICT (trigger_date) DO UPDATE SET
            status = 'pending',
            updated_at = now();

        -- Per ogni amministratore con monitoraggio abilitato
        FOR admin_record IN
            SELECT admin_id, attendance_alert_delay_minutes
            FROM public.admin_settings
            WHERE attendance_alert_enabled = true
        LOOP
            RAISE NOTICE '[Attendance Monitor Cron] Elaborazione admin % (ritardo: % minuti)',
                admin_record.admin_id, admin_record.attendance_alert_delay_minutes;

            -- 🔧 FIX: Aggiunto le colonne booleane per i giorni
            FOR employee_record IN
                SELECT
                    p.id, p.first_name, p.last_name, p.email,
                    ews.start_time as emp_start_time,
                    ews.work_monday, ews.work_tuesday, ews.work_wednesday,
                    ews.work_thursday, ews.work_friday, ews.work_saturday, ews.work_sunday,
                    ws.monday, ws.tuesday, ws.wednesday, ws.thursday,
                    ws.friday, ws.saturday, ws.sunday,
                    ws.start_time as company_start_time
                FROM public.profiles p
                LEFT JOIN public.employee_work_schedules ews ON p.id = ews.employee_id AND (ews.is_active IS NULL OR ews.is_active = true)
                CROSS JOIN public.work_schedules ws
                WHERE p.role = 'employee' AND p.is_active = true
            LOOP
                employee_name := TRIM(COALESCE(employee_record.first_name, '') || ' ' || COALESCE(employee_record.last_name, ''));

                -- 🔧 FIX: Determina se è un giorno lavorativo usando colonne booleane
                is_working_day := false;

                IF employee_record.emp_start_time IS NOT NULL THEN
                    -- Usa orario personalizzato del dipendente con colonne booleane
                    CASE current_day_name
                        WHEN 'monday' THEN is_working_day := COALESCE(employee_record.work_monday, true);
                        WHEN 'tuesday' THEN is_working_day := COALESCE(employee_record.work_tuesday, true);
                        WHEN 'wednesday' THEN is_working_day := COALESCE(employee_record.work_wednesday, true);
                        WHEN 'thursday' THEN is_working_day := COALESCE(employee_record.work_thursday, true);
                        WHEN 'friday' THEN is_working_day := COALESCE(employee_record.work_friday, true);
                        WHEN 'saturday' THEN is_working_day := COALESCE(employee_record.work_saturday, false);
                        WHEN 'sunday' THEN is_working_day := COALESCE(employee_record.work_sunday, false);
                    END CASE;
                    expected_start_time := employee_record.emp_start_time;
                ELSE
                    -- Usa orario aziendale
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

                -- Verifica se è in ferie o permesso
                SELECT COUNT(*) INTO leave_count
                FROM public.leave_requests
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

                -- Calcola momento dell'avviso
                alert_time := (current_date_str || ' ' || expected_start_time)::timestamp +
                             (admin_record.attendance_alert_delay_minutes || ' minutes')::interval;

                IF current_timestamp_val < alert_time THEN
                    CONTINUE;
                END IF;

                -- Verifica se ha già registrato l'entrata
                SELECT COUNT(*) INTO attendance_count
                FROM public.attendances
                WHERE user_id = employee_record.id
                AND date = current_date_str::date
                AND check_in_time IS NOT NULL;

                IF attendance_count > 0 THEN
                    CONTINUE;
                END IF;

                -- Verifica se abbiamo già creato un avviso per oggi
                SELECT COUNT(*) INTO alert_count
                FROM public.attendance_alerts
                WHERE employee_id = employee_record.id
                AND alert_date = current_date_str::date;

                IF alert_count > 0 THEN
                    CONTINUE;
                END IF;

                -- Crea nuovo avviso
                INSERT INTO public.attendance_alerts (
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

        -- Conta avvisi totali pendenti
        SELECT COUNT(*) INTO pending_alerts
        FROM public.attendance_alerts
        WHERE alert_date = current_date_str::date
        AND email_sent_at IS NULL;

        RAISE NOTICE '[Attendance Monitor Cron] Controllo completato: % nuovi avvisi, % totali pendenti',
            alerts_created, pending_alerts;

        -- Chiama Edge Function se necessario
        IF alerts_created > 0 THEN
            RAISE NOTICE '[Attendance Monitor Cron] Chiamata Edge Function attendance-monitor per % avvisi',
                alerts_created;

            BEGIN
                SELECT content INTO edge_response
                FROM http((
                    'POST',
                    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/attendance-monitor',
                    ARRAY[
                        http_header('Content-Type', 'application/json'),
                        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTEyNzYsImV4cCI6MjA2NTQ2NzI3Nn0.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ')
                    ],
                    'application/json',
                    '{}'
                ));

                RAISE NOTICE '[Attendance Monitor Cron] Risposta Edge Function: %', edge_response;
                edge_response := COALESCE(edge_response, 'Risposta vuota dalla Edge Function');

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

COMMENT ON FUNCTION public.attendance_monitor_cron() IS
  'Monitors employee attendance using boolean columns for work days';

-- Test
SELECT '✅ Fix work_days applicato!' as status;
SELECT 'TEST:' as label, public.attendance_monitor_cron() as result;
