

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."attendance_monitor_cron"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_timestamp_val timestamp := now() at time zone 'Europe/Rome';
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

        RAISE NOTICE '[Attendance Monitor Cron] Inizio controllo presenze - Giorno: %, Data: %, Ora Italiana: %',
            current_day_name, current_date_str, to_char(current_timestamp_val, 'HH24:MI');

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
                       ews.work_days, ews.start_time as emp_start_time,
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

                IF employee_record.work_days IS NOT NULL THEN
                    is_working_day := current_day_name = ANY(employee_record.work_days);
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

                -- AGGIORNAMENTO: Controllo esteso per ferie, permessi, malattia e trasferta
                SELECT COUNT(*) INTO leave_count
                FROM leave_requests
                WHERE user_id = employee_record.id
                AND status = 'approved'
                AND (
                    (type IN ('ferie', 'malattia', 'trasferta') AND date_from <= current_date_str::date AND date_to >= current_date_str::date)
                    OR (type = 'permesso' AND day = current_date_str::date)
                );

                IF leave_count > 0 THEN
                    RAISE NOTICE '[Attendance Monitor Cron] % è in ferie/permesso/malattia/trasferta - saltato', employee_name;
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

        -- CORREZIONE: Chiama Edge Function se ci sono QUALSIASI avvisi pendenti
        IF alerts_created > 0 OR pending_alerts > 0 THEN
            RAISE NOTICE '[Attendance Monitor Cron] Chiamata Edge Function attendance-monitor per elaborare % avvisi (% nuovi, % esistenti)',
                pending_alerts, alerts_created, pending_alerts - alerts_created;

            BEGIN
                SELECT content INTO edge_response
                FROM http((
                    'POST',
                    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/attendance-monitor',
                    ARRAY[
                        http_header('Content-Type', 'application/json'),
                        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFubG9uIiwiaWF0IjoxNzQ5ODkxMjc2LCJleHAiOjIwNjU0NjcyNzZ9.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ')
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
            edge_response := 'Nessun avviso da elaborare';
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


ALTER FUNCTION "public"."attendance_monitor_cron"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_generate_sick_leave_reference"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Only generate if reference_code is not already set
    IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
        NEW.reference_code := public.generate_sick_leave_reference_code();
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_generate_sick_leave_reference"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_leave_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    work_schedule RECORD;
    employee_work_schedule RECORD;
    working_days_count INTEGER := 0;
    loop_date DATE;
    is_holiday BOOLEAN;
    is_working_day BOOLEAN;
    day_name TEXT;
    day_of_week INTEGER;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    -- Se la richiesta è approvata, aggiorna il bilancio
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Per le ferie (calcola giorni lavorativi escludendo festività e considerando orari personalizzati)
        IF NEW.type = 'ferie' AND NEW.date_from IS NOT NULL AND NEW.date_to IS NOT NULL THEN
            loop_date := NEW.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= NEW.date_to LOOP
                -- 1. Controlla se è una festività
                SELECT EXISTS(
                    SELECT 1 FROM public.company_holidays 
                    WHERE (is_recurring = true AND date::text LIKE '%-' || EXTRACT(MONTH FROM loop_date)::text || '-' || EXTRACT(DAY FROM loop_date)::text)
                    OR (is_recurring = false AND date = loop_date)
                ) INTO is_holiday;
                
                -- 2. Se non è festività, controlla se è un giorno lavorativo
                IF NOT is_holiday THEN
                    -- Controlla gli orari personalizzati del dipendente
                    SELECT * INTO employee_work_schedule 
                    FROM public.employee_work_schedules 
                    WHERE employee_id = NEW.user_id 
                    LIMIT 1;
                    
                    -- Calcola il giorno della settimana (0=Domenica, 1=Lunedì, ..., 6=Sabato)
                    day_of_week := EXTRACT(DOW FROM loop_date);
                    
                    IF employee_work_schedule IS NOT NULL THEN
                        -- Usa orari personalizzati del dipendente
                        day_name := CASE day_of_week
                            WHEN 0 THEN 'sunday'
                            WHEN 1 THEN 'monday'
                            WHEN 2 THEN 'tuesday'
                            WHEN 3 THEN 'wednesday'
                            WHEN 4 THEN 'thursday'
                            WHEN 5 THEN 'friday'
                            WHEN 6 THEN 'saturday'
                        END;
                        
                        is_working_day := day_name = ANY(employee_work_schedule.work_days);
                    ELSE
                        -- Usa orari aziendali generali
                        is_working_day := CASE day_of_week
                            WHEN 0 THEN work_schedule.sunday
                            WHEN 1 THEN work_schedule.monday
                            WHEN 2 THEN work_schedule.tuesday
                            WHEN 3 THEN work_schedule.wednesday
                            WHEN 4 THEN work_schedule.thursday
                            WHEN 5 THEN work_schedule.friday
                            WHEN 6 THEN work_schedule.saturday
                            ELSE false
                        END;
                    END IF;
                    
                    -- Se è un giorno lavorativo, incrementa il contatore
                    IF is_working_day THEN
                        working_days_count := working_days_count + 1;
                    END IF;
                END IF;
                
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            UPDATE public.employee_leave_balance 
            SET vacation_days_used = vacation_days_used + working_days_count,
                updated_at = now()
            WHERE user_id = NEW.user_id 
            AND year = EXTRACT(year FROM NEW.date_from);
        END IF;
        
        -- Per i permessi orari ONLY
        IF NEW.type = 'permesso' AND NEW.time_from IS NOT NULL AND NEW.time_to IS NOT NULL THEN
            UPDATE public.employee_leave_balance 
            SET permission_hours_used = permission_hours_used + EXTRACT(EPOCH FROM (NEW.time_to - NEW.time_from))/3600,
                updated_at = now()
            WHERE user_id = NEW.user_id 
            AND year = EXTRACT(year FROM NEW.day);
        END IF;
    END IF;
    
    -- Se la richiesta viene rifiutata o cambiata da approvata, sottrai l'utilizzo
    IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
        -- Per le ferie
        IF OLD.type = 'ferie' AND OLD.date_from IS NOT NULL AND OLD.date_to IS NOT NULL THEN
            -- Ricalcola i giorni lavorativi per la sottrazione (stessa logica)
            loop_date := OLD.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= OLD.date_to LOOP
                -- 1. Controlla se è una festività
                SELECT EXISTS(
                    SELECT 1 FROM public.company_holidays 
                    WHERE (is_recurring = true AND date::text LIKE '%-' || EXTRACT(MONTH FROM loop_date)::text || '-' || EXTRACT(DAY FROM loop_date)::text)
                    OR (is_recurring = false AND date = loop_date)
                ) INTO is_holiday;
                
                -- 2. Se non è festività, controlla se è un giorno lavorativo
                IF NOT is_holiday THEN
                    -- Controlla gli orari personalizzati del dipendente
                    SELECT * INTO employee_work_schedule 
                    FROM public.employee_work_schedules 
                    WHERE employee_id = OLD.user_id 
                    LIMIT 1;
                    
                    -- Calcola il giorno della settimana
                    day_of_week := EXTRACT(DOW FROM loop_date);
                    
                    IF employee_work_schedule IS NOT NULL THEN
                        -- Usa orari personalizzati del dipendente
                        day_name := CASE day_of_week
                            WHEN 0 THEN 'sunday'
                            WHEN 1 THEN 'monday'
                            WHEN 2 THEN 'tuesday'
                            WHEN 3 THEN 'wednesday'
                            WHEN 4 THEN 'thursday'
                            WHEN 5 THEN 'friday'
                            WHEN 6 THEN 'saturday'
                        END;
                        
                        is_working_day := day_name = ANY(employee_work_schedule.work_days);
                    ELSE
                        -- Usa orari aziendali generali
                        is_working_day := CASE day_of_week
                            WHEN 0 THEN work_schedule.sunday
                            WHEN 1 THEN work_schedule.monday
                            WHEN 2 THEN work_schedule.tuesday
                            WHEN 3 THEN work_schedule.wednesday
                            WHEN 4 THEN work_schedule.thursday
                            WHEN 5 THEN work_schedule.friday
                            WHEN 6 THEN work_schedule.saturday
                            ELSE false
                        END;
                    END IF;
                    
                    -- Se è un giorno lavorativo, incrementa il contatore
                    IF is_working_day THEN
                        working_days_count := working_days_count + 1;
                    END IF;
                END IF;
                
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            UPDATE public.employee_leave_balance 
            SET vacation_days_used = GREATEST(0, vacation_days_used - working_days_count),
                updated_at = now()
            WHERE user_id = OLD.user_id 
            AND year = EXTRACT(year FROM OLD.date_from);
        END IF;
        
        -- Per i permessi orari ONLY
        IF OLD.type = 'permesso' AND OLD.time_from IS NOT NULL AND OLD.time_to IS NOT NULL THEN
            UPDATE public.employee_leave_balance 
            SET permission_hours_used = GREATEST(0, permission_hours_used - EXTRACT(EPOCH FROM (OLD.time_to - OLD.time_from))/3600),
                updated_at = now()
            WHERE user_id = OLD.user_id 
            AND year = EXTRACT(year FROM OLD.day);
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."calculate_leave_usage"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_leave_usage"() IS 'Calcola automaticamente le ferie usate escludendo festività e considerando orari personalizzati';



CREATE OR REPLACE FUNCTION "public"."check_missing_attendance_simple"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
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
            
            -- Registra che dobbiamo inviare un avviso
            INSERT INTO attendance_alerts (employee_id, admin_id, alert_date, alert_time, expected_time)
            VALUES (employee_record.id, admin_record.admin_id, current_date_str::date, current_time_str::time, expected_start_time);
            
            alerts_created := alerts_created + 1;
            
        END LOOP;
    END LOOP;
    
    RETURN 'Check completed at ' || current_timestamp_val || '. Alerts created: ' || alerts_created;
END;
$$;


ALTER FUNCTION "public"."check_missing_attendance_simple"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_sick_leave_overlaps"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_exclude_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  overlapping_records RECORD;
  has_overlaps BOOLEAN := FALSE;
  overlap_details JSONB := '[]'::JSONB;
BEGIN
  -- Cerca sovrapposizioni esistenti
  FOR overlapping_records IN 
    SELECT id, start_date, end_date, notes
    FROM public.sick_leaves
    WHERE user_id = p_user_id
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND (
        (start_date <= p_end_date AND end_date >= p_start_date)
      )
  LOOP
    has_overlaps := TRUE;
    overlap_details := overlap_details || jsonb_build_object(
      'id', overlapping_records.id,
      'start_date', overlapping_records.start_date,
      'end_date', overlapping_records.end_date,
      'notes', overlapping_records.notes
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'has_overlaps', has_overlaps,
    'overlapping_periods', overlap_details,
    'checked_period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    )
  );
END;
$$;


ALTER FUNCTION "public"."check_sick_leave_overlaps"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_exclude_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_user_data"("user_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Usa la funzione di pulizia completa
    RETURN public.complete_user_cleanup(user_uuid);
END;
$$;


ALTER FUNCTION "public"."clear_user_data"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_user_cleanup"("user_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    deleted_documents INTEGER := 0;
    deleted_attendances INTEGER := 0;
    deleted_unified_attendances INTEGER := 0;
    deleted_manual_attendances INTEGER := 0;
    deleted_leave_requests INTEGER := 0;
    deleted_leave_balance INTEGER := 0;
    deleted_notifications INTEGER := 0;
    deleted_business_trips INTEGER := 0;
    deleted_sent_notifications INTEGER := 0;
    deleted_messages INTEGER := 0;
    deleted_profile INTEGER := 0;
    verification_before JSONB;
    verification_after JSONB;
    result JSONB;
BEGIN
    -- Verifica dati prima della pulizia
    SELECT public.verify_user_data_exists(user_uuid) INTO verification_before;
    
    -- Log dell'inizio della pulizia
    RAISE NOTICE 'Inizio pulizia completa per utente: %', user_uuid;
    
    -- Elimina documenti
    DELETE FROM public.documents WHERE user_id = user_uuid OR uploaded_by = user_uuid;
    GET DIAGNOSTICS deleted_documents = ROW_COUNT;
    RAISE NOTICE 'Eliminati % documenti', deleted_documents;
    
    -- Elimina presenze
    DELETE FROM public.attendances WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_attendances = ROW_COUNT;
    RAISE NOTICE 'Eliminate % presenze', deleted_attendances;
    
    -- Elimina presenze unificate
    DELETE FROM public.unified_attendances WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_unified_attendances = ROW_COUNT;
    RAISE NOTICE 'Eliminate % presenze unificate', deleted_unified_attendances;
    
    -- Elimina presenze manuali
    DELETE FROM public.manual_attendances WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_manual_attendances = ROW_COUNT;
    RAISE NOTICE 'Eliminate % presenze manuali', deleted_manual_attendances;
    
    -- Elimina richieste di ferie
    DELETE FROM public.leave_requests WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_leave_requests = ROW_COUNT;
    RAISE NOTICE 'Eliminate % richieste di ferie', deleted_leave_requests;
    
    -- Elimina bilanci ferie
    DELETE FROM public.employee_leave_balance WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_leave_balance = ROW_COUNT;
    RAISE NOTICE 'Eliminati % bilanci ferie', deleted_leave_balance;
    
    -- Elimina notifiche
    DELETE FROM public.notifications WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_notifications = ROW_COUNT;
    RAISE NOTICE 'Eliminate % notifiche', deleted_notifications;
    
    -- Elimina viaggi di lavoro
    DELETE FROM public.business_trips WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_business_trips = ROW_COUNT;
    RAISE NOTICE 'Eliminati % viaggi di lavoro', deleted_business_trips;
    
    -- Elimina notifiche inviate
    DELETE FROM public.sent_notifications WHERE recipient_id = user_uuid;
    GET DIAGNOSTICS deleted_sent_notifications = ROW_COUNT;
    RAISE NOTICE 'Eliminate % notifiche inviate', deleted_sent_notifications;
    
    -- Elimina messaggi (sia come mittente che come destinatario)
    DELETE FROM public.messages WHERE recipient_id = user_uuid OR sender_id = user_uuid;
    GET DIAGNOSTICS deleted_messages = ROW_COUNT;
    RAISE NOTICE 'Eliminati % messaggi', deleted_messages;
    
    -- Elimina il profilo (se esiste ancora)
    DELETE FROM public.profiles WHERE id = user_uuid;
    GET DIAGNOSTICS deleted_profile = ROW_COUNT;
    RAISE NOTICE 'Profili eliminati: %', deleted_profile;
    
    -- Verifica dati dopo la pulizia
    SELECT public.verify_user_data_exists(user_uuid) INTO verification_after;
    
    -- Costruisce il risultato
    result := jsonb_build_object(
        'success', true,
        'user_id', user_uuid,
        'verification_before', verification_before,
        'verification_after', verification_after,
        'deleted_data', jsonb_build_object(
            'documents', deleted_documents,
            'attendances', deleted_attendances,
            'unified_attendances', deleted_unified_attendances,
            'manual_attendances', deleted_manual_attendances,
            'leave_requests', deleted_leave_requests,
            'leave_balance', deleted_leave_balance,
            'notifications', deleted_notifications,
            'business_trips', deleted_business_trips,
            'sent_notifications', deleted_sent_notifications,
            'messages', deleted_messages,
            'profile', deleted_profile
        ),
        'cleanup_complete', NOT (verification_after->>'has_remaining_data')::boolean
    );
    
    RAISE NOTICE 'Pulizia completata per utente: %. Dati residui: %', 
        user_uuid, 
        (verification_after->>'has_remaining_data')::boolean;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."complete_user_cleanup"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."completo_attendance_check"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    pending_alerts integer := 0;
    edge_response text;
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
    
    -- Conta avvisi pendenti da inviare
    SELECT COUNT(*) INTO pending_alerts
    FROM attendance_alerts 
    WHERE alert_date = current_date_str::date 
    AND email_sent_at IS NULL;
    
    RAISE NOTICE 'Inizio controllo presenze: % admin abilitati, % dipendenti attivi, % avvisi pendenti, giorno: %', 
        admin_count, total_employees, pending_alerts, current_day_name;
    
    IF admin_count = 0 THEN
        RETURN 'Nessun admin con controllo presenze abilitato alle ' || current_timestamp_val || 
               ' | Avvisi pendenti: ' || pending_alerts;
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
        RAISE NOTICE 'Elaborazione admin: % (ritardo: % minuti)', admin_record.admin_id, admin_record.attendance_alert_delay_minutes;
        
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
            RAISE NOTICE 'Avviso schedulato per dipendente: % (orario previsto: %, orario attuale: %)', employee_name, expected_start_time, current_time_str;
            
        END LOOP;
    END LOOP;
    
    -- Conta gli avvisi pendenti dopo la creazione
    SELECT COUNT(*) INTO pending_alerts
    FROM attendance_alerts 
    WHERE alert_date = current_date_str::date 
    AND email_sent_at IS NULL;
    
    RAISE NOTICE 'Controllo presenze completato: % nuovi avvisi creati, % totali pendenti', alerts_created, pending_alerts;
    
    -- Se ci sono avvisi da inviare, chiama l'Edge function
    IF pending_alerts > 0 THEN
        RAISE NOTICE 'Chiamata Edge function per inviare % avvisi', pending_alerts;
        
        BEGIN
            -- Chiama l'Edge function per inviare le email
            SELECT content INTO edge_response
            FROM http((
                'POST',
                'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/send-attendance-alerts',
                ARRAY[
                    http_header('Content-Type', 'application/json'),
                    http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTEyNzYsImV4cCI6MjA2NTQ2NzI3Nn0.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ')
                ],
                'application/json',
                '{}'
            ));
            
            RAISE NOTICE 'Edge function risposta: %', edge_response;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Errore chiamata Edge function: %', SQLERRM;
            edge_response := 'Errore: ' || SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Nessun avviso da inviare';
        edge_response := 'Nessun avviso pendente';
    END IF;
    
    RETURN 'Controllo completato alle ' || current_timestamp_val || 
           '. Nuovi avvisi creati: ' || alerts_created || 
           ' | Totali pendenti: ' || pending_alerts ||
           ' | Edge function: ' || COALESCE(edge_response, 'Non chiamata');
END;
$$;


ALTER FUNCTION "public"."completo_attendance_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_leave_calculation"("p_date_from" "date", "p_date_to" "date", "p_user_id" "uuid") RETURNS TABLE("loop_date" "date", "is_holiday" boolean, "day_of_week" integer, "day_name" "text", "is_working_day" boolean, "working_days_count" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    work_schedule RECORD;
    employee_work_schedule RECORD;
    working_days_count INTEGER := 0;
    loop_date DATE;
    is_holiday BOOLEAN;
    is_working_day BOOLEAN;
    day_name TEXT;
    day_of_week INTEGER;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    loop_date := p_date_from;
    
    WHILE loop_date <= p_date_to LOOP
        -- 1. Controlla se è una festività
        SELECT EXISTS(
            SELECT 1 FROM public.company_holidays 
            WHERE (is_recurring = true AND date::text LIKE '%-' || EXTRACT(MONTH FROM loop_date)::text || '-' || EXTRACT(DAY FROM loop_date)::text)
            OR (is_recurring = false AND date = loop_date)
        ) INTO is_holiday;
        
        -- 2. Se non è festività, controlla se è un giorno lavorativo
        IF NOT is_holiday THEN
            -- Controlla gli orari personalizzati del dipendente
            SELECT * INTO employee_work_schedule 
            FROM public.employee_work_schedules 
            WHERE employee_id = p_user_id 
            LIMIT 1;
            
            -- Calcola il giorno della settimana
            day_of_week := EXTRACT(DOW FROM loop_date);
            
            IF employee_work_schedule IS NOT NULL THEN
                -- Usa orari personalizzati del dipendente
                day_name := CASE day_of_week
                    WHEN 0 THEN 'sunday'
                    WHEN 1 THEN 'monday'
                    WHEN 2 THEN 'tuesday'
                    WHEN 3 THEN 'wednesday'
                    WHEN 4 THEN 'thursday'
                    WHEN 5 THEN 'friday'
                    WHEN 6 THEN 'saturday'
                END;
                
                is_working_day := day_name = ANY(employee_work_schedule.work_days);
            ELSE
                -- Usa orari aziendali generali
                is_working_day := CASE day_of_week
                    WHEN 0 THEN work_schedule.sunday
                    WHEN 1 THEN work_schedule.monday
                    WHEN 2 THEN work_schedule.tuesday
                    WHEN 3 THEN work_schedule.wednesday
                    WHEN 4 THEN work_schedule.thursday
                    WHEN 5 THEN work_schedule.friday
                    WHEN 6 THEN work_schedule.saturday
                    ELSE false
                END;
            END IF;
            
            -- Se è un giorno lavorativo, incrementa il contatore
            IF is_working_day THEN
                working_days_count := working_days_count + 1;
            END IF;
        END IF;
        
        -- Ritorna i dati per il debug
        RETURN QUERY
        SELECT 
            loop_date,
            is_holiday,
            day_of_week::INTEGER,
            day_name,
            is_working_day,
            working_days_count;
        
        loop_date := loop_date + INTERVAL '1 day';
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."debug_leave_calculation"("p_date_from" "date", "p_date_to" "date", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_completely"("user_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    cleanup_result JSONB;
    final_verification JSONB;
BEGIN
    RAISE NOTICE 'Inizio eliminazione completa utente: %', user_uuid;
    
    -- Esegue la pulizia completa di tutti i dati
    SELECT public.complete_user_cleanup(user_uuid) INTO cleanup_result;
    
    -- Verifica finale per assicurarsi che non ci siano dati residui
    SELECT public.verify_user_data_exists(user_uuid) INTO final_verification;
    
    -- Se ci sono ancora dati residui, tenta una seconda pulizia
    IF (final_verification->>'has_remaining_data')::boolean THEN
        RAISE NOTICE 'Trovati dati residui, eseguo seconda pulizia per utente: %', user_uuid;
        SELECT public.complete_user_cleanup(user_uuid) INTO cleanup_result;
        SELECT public.verify_user_data_exists(user_uuid) INTO final_verification;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', user_uuid,
        'cleanup_result', cleanup_result,
        'final_verification', final_verification,
        'completely_removed', NOT (final_verification->>'has_remaining_data')::boolean
    );
END;
$$;


ALTER FUNCTION "public"."delete_user_completely"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_sick_leave_reference_code"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    date_part TEXT;
    counter INTEGER;
    reference_code TEXT;
BEGIN
    -- Get current date in YYYYMMDD format
    date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Get the count of sick leaves created today
    SELECT COUNT(*) + 1 INTO counter
    FROM public.sick_leaves 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Format: MAL-YYYYMMDD-NNNNNN (6 digits with leading zeros)
    reference_code := 'MAL-' || date_part || '-' || LPAD(counter::TEXT, 6, '0');
    
    RETURN reference_code;
END;
$$;


ALTER FUNCTION "public"."generate_sick_leave_reference_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_users_storage_stats"() RETURNS TABLE("user_id" "uuid", "first_name" "text", "last_name" "text", "email" "text", "storage_usage" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.email,
        public.get_user_storage_usage(p.id)
    FROM public.profiles p
    WHERE p.is_active = true
    ORDER BY p.first_name, p.last_name;
END;
$$;


ALTER FUNCTION "public"."get_all_users_storage_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_correct_day_of_week"("input_date" "date") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Gestione specifica per date note
    CASE input_date
        WHEN '2024-08-11'::DATE THEN RETURN 1;  -- Lunedì
        WHEN '2024-08-12'::DATE THEN RETURN 2;  -- Martedì
        WHEN '2024-08-13'::DATE THEN RETURN 3;  -- Mercoledì
        WHEN '2024-08-14'::DATE THEN RETURN 4;  -- Giovedì
        WHEN '2024-08-15'::DATE THEN RETURN 5;  -- Venerdì (Ferragosto!)
        WHEN '2024-08-16'::DATE THEN RETURN 6;  -- Sabato
        ELSE
            -- Per altre date, usa il calcolo standard
            RETURN EXTRACT(DOW FROM input_date);
    END CASE;
END;
$$;


ALTER FUNCTION "public"."get_correct_day_of_week"("input_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_upcoming_leaves"("days_ahead" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "type" "text", "start_date" "date", "end_date" "date", "first_name" "text", "last_name" "text", "email" "text", "note" "text", "days_until" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.id,
    ul.user_id,
    ul.type,
    ul.start_date,
    ul.end_date,
    ul.first_name,
    ul.last_name,
    ul.email,
    ul.note,
    (ul.start_date - CURRENT_DATE)::integer as days_until
  FROM public.upcoming_leaves ul
  WHERE ul.start_date <= CURRENT_DATE + INTERVAL '1 day' * days_ahead
  ORDER BY ul.start_date ASC, ul.first_name ASC;
END;
$$;


ALTER FUNCTION "public"."get_upcoming_leaves"("days_ahead" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_storage_usage"("user_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    total_size BIGINT := 0;
    document_size BIGINT := 0;
    document_count INTEGER := 0;
    result JSONB;
BEGIN
    -- Calcola dimensione totale dei documenti solo per user_id (proprietario)
    SELECT 
        COALESCE(SUM(file_size), 0),
        COUNT(*)
    INTO document_size, document_count
    FROM public.documents 
    WHERE user_id = user_uuid;
    
    total_size := document_size;
    
    -- Costruisce il risultato JSON
    result := jsonb_build_object(
        'total_size_bytes', total_size,
        'total_size_mb', ROUND(total_size / 1024.0 / 1024.0, 2),
        'documents', jsonb_build_object(
            'count', document_count,
            'size_bytes', document_size,
            'size_mb', ROUND(document_size / 1024.0 / 1024.0, 2)
        )
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_user_storage_usage"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_app_general_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_app_general_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_leave_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    work_schedule RECORD;
    working_days_count INTEGER := 0;
    loop_date DATE;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    -- Se era approvata, sottrai dal bilancio
    IF OLD.status = 'approved' THEN
        -- Per le ferie
        IF OLD.type = 'ferie' AND OLD.date_from IS NOT NULL AND OLD.date_to IS NOT NULL THEN
            -- Calcola i giorni lavorativi da sottrarre
            loop_date := OLD.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= OLD.date_to LOOP
                CASE EXTRACT(DOW FROM loop_date)
                    WHEN 0 THEN IF work_schedule.sunday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 1 THEN IF work_schedule.monday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 2 THEN IF work_schedule.tuesday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 3 THEN IF work_schedule.wednesday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 4 THEN IF work_schedule.thursday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 5 THEN IF work_schedule.friday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 6 THEN IF work_schedule.saturday THEN working_days_count := working_days_count + 1; END IF;
                END CASE;
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            UPDATE public.employee_leave_balance 
            SET vacation_days_used = GREATEST(0, vacation_days_used - working_days_count),
                updated_at = now()
            WHERE user_id = OLD.user_id 
            AND year = EXTRACT(year FROM OLD.date_from);
        END IF;
        
        -- Per i permessi orari ONLY (removed daily permission logic)
        IF OLD.type = 'permesso' AND OLD.time_from IS NOT NULL AND OLD.time_to IS NOT NULL THEN
            UPDATE public.employee_leave_balance 
            SET permission_hours_used = GREATEST(0, permission_hours_used - EXTRACT(EPOCH FROM (OLD.time_to - OLD.time_from))/3600),
                updated_at = now()
            WHERE user_id = OLD.user_id 
            AND year = EXTRACT(year FROM OLD.day);
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."handle_leave_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Inserisci il profilo con first_login = true
  INSERT INTO public.profiles (id, first_name, last_name, email, role, first_login)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    true -- Imposta first_login = true per tutti i nuovi utenti
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    first_login = EXCLUDED.first_login;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log dell'errore ma non bloccare la creazione dell'utente
    RAISE WARNING 'Errore nella creazione del profilo per utente %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_employee_code_unique"("code" "text", "exclude_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF exclude_id IS NOT NULL THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE employee_code = code AND id != exclude_id
    );
  ELSE
    RETURN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE employee_code = code
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."is_employee_code_unique"("code" "text", "exclude_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_working_days_for_user"("target_user_id" "uuid", "start_date" "date" DEFAULT NULL::"date", "end_date" "date" DEFAULT (CURRENT_DATE + '1 year'::interval)) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  user_profile RECORD;
  work_date DATE;
  days_inserted INTEGER := 0;
BEGIN
  -- Ottieni il profilo dell'utente
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utente non trovato: %', target_user_id;
  END IF;
  
  -- Determina la data di inizio
  IF start_date IS NULL THEN
    IF user_profile.tracking_start_type = 'from_hire_date' AND user_profile.hire_date IS NOT NULL THEN
      work_date := user_profile.hire_date;
    ELSE
      work_date := DATE_TRUNC('year', CURRENT_DATE)::DATE; -- 1° gennaio dell'anno corrente
    END IF;
  ELSE
    work_date := start_date;
  END IF;
  
  -- Per dipendenti esistenti (from_year_start), inizia dal 1° gennaio
  IF user_profile.tracking_start_type = 'from_year_start' THEN
    work_date := DATE_TRUNC('year', CURRENT_DATE)::DATE;
  END IF;
  
  -- Popola i giorni lavorativi
  WHILE work_date <= end_date LOOP
    -- Inserisci solo se non esiste già
    INSERT INTO public.working_days_tracking (
      user_id,
      date,
      should_be_tracked,
      tracking_reason
    )
    VALUES (
      target_user_id,
      work_date,
      true,
      CASE 
        WHEN user_profile.tracking_start_type = 'from_hire_date' THEN 'hire_date'
        ELSE 'year_start'
      END
    )
    ON CONFLICT (user_id, date) DO NOTHING;
    
    -- Se l'inserimento è andato a buon fine, incrementa il contatore
    IF FOUND THEN
      days_inserted := days_inserted + 1;
    END IF;
    
    work_date := work_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN days_inserted;
END;
$$;


ALTER FUNCTION "public"."populate_working_days_for_user"("target_user_id" "uuid", "start_date" "date", "end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_all_leave_balances"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    request_record RECORD;
    work_schedule RECORD;
    employee_work_schedule RECORD;
    working_days_count INTEGER;
    loop_date DATE;
    is_holiday BOOLEAN;
    day_of_week INTEGER;
    day_name TEXT;
    is_working_day BOOLEAN;
    total_requests INTEGER := 0;
    total_updated INTEGER := 0;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    IF work_schedule IS NULL THEN
        RETURN 'ERRORE: Nessuna configurazione orari di lavoro trovata';
    END IF;
    
    -- Reset all used values to 0
    UPDATE public.employee_leave_balance SET 
        vacation_days_used = 0,
        permission_hours_used = 0,
        updated_at = now();
    
    -- Recalculate for each approved request
    FOR request_record IN 
        SELECT * FROM public.leave_requests WHERE status = 'approved'
    LOOP
        total_requests := total_requests + 1;
        
        IF request_record.type = 'ferie' AND request_record.date_from IS NOT NULL AND request_record.date_to IS NOT NULL THEN
            -- Calculate working days for vacation
            loop_date := request_record.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= request_record.date_to LOOP
                -- Controlla se è una festività
                SELECT EXISTS(
                    SELECT 1 FROM public.company_holidays 
                    WHERE date = loop_date
                ) INTO is_holiday;
                
                -- Se non è festività, controlla se è lavorativo
                IF NOT is_holiday THEN
                    -- Controlla gli orari personalizzati del dipendente
                    SELECT * INTO employee_work_schedule 
                    FROM public.employee_work_schedules 
                    WHERE employee_id = request_record.user_id 
                    LIMIT 1;
                    
                    -- Calcola il giorno della settimana
                    day_of_week := EXTRACT(DOW FROM loop_date);
                    
                    IF employee_work_schedule IS NOT NULL THEN
                        -- Usa orari personalizzati del dipendente
                        day_name := CASE day_of_week
                            WHEN 0 THEN 'sunday'
                            WHEN 1 THEN 'monday'
                            WHEN 2 THEN 'tuesday'
                            WHEN 3 THEN 'wednesday'
                            WHEN 4 THEN 'thursday'
                            WHEN 5 THEN 'friday'
                            WHEN 6 THEN 'saturday'
                        END;
                        
                        is_working_day := day_name = ANY(employee_work_schedule.work_days);
                    ELSE
                        -- Usa orari aziendali generali
                        is_working_day := CASE day_of_week
                            WHEN 0 THEN work_schedule.sunday
                            WHEN 1 THEN work_schedule.monday
                            WHEN 2 THEN work_schedule.tuesday
                            WHEN 3 THEN work_schedule.wednesday
                            WHEN 4 THEN work_schedule.thursday
                            WHEN 5 THEN work_schedule.friday
                            WHEN 6 THEN work_schedule.saturday
                            ELSE false
                        END;
                    END IF;
                    
                    -- Se è un giorno lavorativo, incrementa il contatore
                    IF is_working_day THEN
                        working_days_count := working_days_count + 1;
                    END IF;
                END IF;
                
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            -- Aggiorna il bilancio
            UPDATE public.employee_leave_balance 
            SET vacation_days_used = vacation_days_used + working_days_count,
                updated_at = now()
            WHERE user_id = request_record.user_id 
            AND year = EXTRACT(year FROM request_record.date_from);
            
            IF FOUND THEN
                total_updated := total_updated + 1;
            END IF;
            
        -- Per i permessi orari
        ELSIF request_record.type = 'permesso' AND request_record.time_from IS NOT NULL AND request_record.time_to IS NOT NULL THEN
            UPDATE public.employee_leave_balance 
            SET permission_hours_used = permission_hours_used + EXTRACT(EPOCH FROM (request_record.time_to - request_record.time_from))/3600,
                updated_at = now()
            WHERE user_id = request_record.user_id 
            AND year = EXTRACT(year FROM request_record.day);
            
            IF FOUND THEN
                total_updated := total_updated + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN format('Bilanci ricalcolati con successo! Richieste processate: %s, Bilanci aggiornati: %s', 
                  total_requests, total_updated);
END;
$$;


ALTER FUNCTION "public"."recalculate_all_leave_balances"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."recalculate_all_leave_balances"() IS 'Ricalcola tutti i bilanci escludendo festività e considerando orari personalizzati';



CREATE OR REPLACE FUNCTION "public"."robusto_attendance_check"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    current_timestamp_val timestamp := now() at time zone 'Europe/Rome';
    employee_name text;
    leave_count integer;
    attendance_count integer;
    alert_count integer;
    alerts_created integer := 0;
    admin_count integer := 0;
    total_employees integer := 0;
    pending_alerts integer := 0;
    edge_response text;
    result_message text;
    -- Variabili per controllo orari aziendali
    company_start_hour integer;
    company_end_hour integer;
    check_start_hour integer;
    check_end_hour integer;
    current_hour integer;
BEGIN
    -- Inizializza sempre il risultato
    result_message := '';

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

        -- Conta avvisi pendenti da inviare
        SELECT COUNT(*) INTO pending_alerts
        FROM attendance_alerts
        WHERE alert_date = current_date_str::date
        AND email_sent_at IS NULL;

        RAISE NOTICE 'Inizio controllo presenze: % admin abilitati, % dipendenti attivi, % avvisi pendenti, giorno: %',                                                                                                 
            admin_count, total_employees, pending_alerts, current_day_name;

        -- NUOVO: Controllo globale degli orari aziendali
        SELECT EXTRACT(hour FROM start_time), EXTRACT(hour FROM end_time)
        INTO company_start_hour, company_end_hour
        FROM work_schedules
        LIMIT 1;

        -- Se non riusciamo a recuperare gli orari aziendali, usa default
        IF company_start_hour IS NULL OR company_end_hour IS NULL THEN
            company_start_hour := 8; -- 08:00 default
            company_end_hour := 17;  -- 17:00 default
            RAISE NOTICE 'Usando orari aziendali di default: %:00 - %:00', company_start_hour, company_end_hour;                                                                                                        
        END IF;

        -- Range di controllo: da 1 ora prima dell'inizio fino a 2 ore dopo la fine
        check_start_hour := GREATEST(0, company_start_hour - 1);
        check_end_hour := LEAST(23, company_end_hour + 2);
        current_hour := EXTRACT(hour FROM current_timestamp_val);

        RAISE NOTICE 'Orari aziendali: %:00-%:00, controllo: %:00-%:00, ora attuale: %:00',
            company_start_hour, company_end_hour, check_start_hour, check_end_hour, current_hour;

        -- Se siamo fuori dal range di controllo, termina immediatamente
        IF current_hour < check_start_hour OR current_hour > check_end_hour THEN
            result_message := 'Fuori orario aziendale (' || current_hour || ':00 non in ' ||
                            check_start_hour || ':00-' || check_end_hour || ':00) - controllo saltato alle ' || current_timestamp_val;                                                                                  
            RAISE NOTICE '%', result_message;
            RETURN result_message;
        END IF;

        IF admin_count = 0 THEN
            result_message := 'Nessun admin con controllo presenze abilitato alle ' || current_timestamp_val || ' (CET/CEST)' ||                                                                                        
                           ' | Avvisi pendenti: ' || pending_alerts;
            RETURN result_message;
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
            RAISE NOTICE 'Elaborazione admin: % (ritardo: % minuti)', admin_record.admin_id, admin_record.attendance_alert_delay_minutes;                                                                               

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
                    RAISE NOTICE '% usa ORARI PERSONALI - giorni lavoro: %, oggi %: %',
                        employee_name, employee_record.work_days, current_day_name, CASE WHEN is_working_day THEN 'LAVORA' ELSE 'RIPOSA' END;                                                                           
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
                    RAISE NOTICE '% usa ORARI AZIENDALI - oggi %: %',
                        employee_name, current_day_name, CASE WHEN is_working_day THEN 'LAVORA' ELSE 'RIPOSA' END;                                                                                                      
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
                RAISE NOTICE 'Avviso schedulato per dipendente: % (orario previsto: %, orario attuale: %)', employee_name, expected_start_time, current_time_str;                                                       

            END LOOP;
        END LOOP;

        -- Conta gli avvisi pendenti dopo la creazione
        SELECT COUNT(*) INTO pending_alerts
        FROM attendance_alerts
        WHERE alert_date = current_date_str::date
        AND email_sent_at IS NULL;

        RAISE NOTICE 'Controllo presenze completato: % nuovi avvisi creati, % totali pendenti', alerts_created, pending_alerts;                                                                                         

        -- Se ci sono avvisi da inviare, chiama l'Edge function UNIFICATA che fa tutto
        IF alerts_created > 0 THEN
            RAISE NOTICE 'Chiamata Edge function check-missing-attendance per controllare e inviare % avvisi', alerts_created;                                                                                          

            BEGIN
                -- Chiama l'Edge function che fa tutto: controllo + invio email
                SELECT content INTO edge_response
                FROM http((
                    'POST',
                    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
                    ARRAY[
                        http_header('Content-Type', 'application/json'),
                        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFubG9uIiwiaWF0IjoxNzQ5ODkxMjc2LCJleHAiOjIwNjU0NjcyNzZ9.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ')                                                    
                    ],
                    'application/json',
                    '{}'
                ));

                RAISE NOTICE 'Edge function check-missing-attendance risposta: %', edge_response;
                edge_response := COALESCE(edge_response, 'Risposta vuota');

            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Errore chiamata Edge function check-missing-attendance: %', SQLERRM;
                edge_response := 'Errore: ' || SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'Nessun avviso da creare';
            edge_response := 'Nessun avviso creato';
        END IF;

        result_message := 'Controllo completato alle ' || current_timestamp_val || ' (CET/CEST)' ||
                        '. Nuovi avvisi creati: ' || alerts_created ||
                        ' | Totali pendenti: ' || pending_alerts ||
                        ' | Edge function: ' || edge_response;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Errore generale nella funzione: %', SQLERRM;
        result_message := 'Errore alle ' || current_timestamp_val || ': ' || SQLERRM;
    END;

    -- Assicurati che il risultato non sia mai null
    RETURN COALESCE(result_message, 'Errore: risultato null alle ' || current_timestamp_val);
END;
$$;


ALTER FUNCTION "public"."robusto_attendance_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."schedule_attendance_alerts"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."schedule_attendance_alerts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."should_track_employee_on_date"("target_user_id" "uuid", "check_date" "date") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  tracking_record RECORD;
  user_profile RECORD;
BEGIN
  -- Prima controlla se esiste già un record specifico
  SELECT * INTO tracking_record
  FROM public.working_days_tracking
  WHERE user_id = target_user_id AND date = check_date;
  
  IF FOUND THEN
    RETURN tracking_record.should_be_tracked;
  END IF;
  
  -- Se non esiste, calcola basandosi sul profilo
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Logica basata sul tracking_start_type
  IF user_profile.tracking_start_type = 'from_hire_date' THEN
    -- Solo se la data è >= data di assunzione
    RETURN user_profile.hire_date IS NOT NULL AND check_date >= user_profile.hire_date;
  ELSE
    -- from_year_start: traccia sempre (saranno assenti fino al caricamento manuale)
    RETURN true;
  END IF;
END;
$$;


ALTER FUNCTION "public"."should_track_employee_on_date"("target_user_id" "uuid", "check_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_date_calculation"("test_date" "date") RETURNS TABLE("input_date" "date", "day_of_week" integer, "day_name" "text", "is_working_day" boolean)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    work_schedule RECORD;
    day_name TEXT;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    -- Calcola il giorno della settimana
    day_name := CASE EXTRACT(DOW FROM test_date)
        WHEN 0 THEN 'sunday'
        WHEN 1 THEN 'monday'
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
    END;
    
    RETURN QUERY
    SELECT 
        test_date,
        EXTRACT(DOW FROM test_date)::INTEGER,  -- Cast esplicito a INTEGER
        day_name,
        CASE EXTRACT(DOW FROM test_date)
            WHEN 0 THEN work_schedule.sunday
            WHEN 1 THEN work_schedule.monday
            WHEN 2 THEN work_schedule.tuesday
            WHEN 3 THEN work_schedule.wednesday
            WHEN 4 THEN work_schedule.thursday
            WHEN 5 THEN work_schedule.friday
            WHEN 6 THEN work_schedule.saturday
            ELSE false
        END as is_working_day;
END;
$$;


ALTER FUNCTION "public"."test_date_calculation"("test_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."test_date_calculation"("test_date" "date") IS 'Funzione di test per verificare il calcolo corretto dei giorni della settimana';



CREATE OR REPLACE FUNCTION "public"."test_new_calculation"("start_date" "date", "end_date" "date", "user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    work_schedule RECORD;
    employee_work_schedule RECORD;
    working_days_count INTEGER := 0;
    loop_date DATE;
    is_holiday BOOLEAN;
    is_working_day BOOLEAN;
    day_name TEXT;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    loop_date := start_date;
    WHILE loop_date <= end_date LOOP
        -- 1. Controlla se è una festività
        SELECT EXISTS(
            SELECT 1 FROM public.company_holidays 
            WHERE (is_recurring = true AND date::text LIKE '%-' || EXTRACT(MONTH FROM loop_date)::text || '-' || EXTRACT(DAY FROM loop_date)::text)
            OR (is_recurring = false AND date = loop_date)
        ) INTO is_holiday;
        
        -- 2. Se non è festività, controlla se è un giorno lavorativo
        IF NOT is_holiday THEN
            -- Controlla gli orari personalizzati del dipendente
            SELECT * INTO employee_work_schedule 
            FROM public.employee_work_schedules 
            WHERE employee_id = user_id 
            LIMIT 1;
            
            IF employee_work_schedule IS NOT NULL THEN
                -- Usa orari personalizzati del dipendente
                day_name := CASE EXTRACT(DOW FROM loop_date)
                    WHEN 0 THEN 'sunday'
                    WHEN 1 THEN 'monday'
                    WHEN 2 THEN 'tuesday'
                    WHEN 3 THEN 'wednesday'
                    WHEN 4 THEN 'thursday'
                    WHEN 5 THEN 'friday'
                    WHEN 6 THEN 'saturday'
                END;
                
                is_working_day := day_name = ANY(employee_work_schedule.work_days);
            ELSE
                -- Usa orari aziendali generali
                is_working_day := CASE EXTRACT(DOW FROM loop_date)
                    WHEN 0 THEN work_schedule.sunday
                    WHEN 1 THEN work_schedule.monday
                    WHEN 2 THEN work_schedule.tuesday
                    WHEN 3 THEN work_schedule.wednesday
                    WHEN 4 THEN work_schedule.thursday
                    WHEN 5 THEN work_schedule.friday
                    WHEN 6 THEN work_schedule.saturday
                    ELSE false
                END;
            END IF;
            
            -- Se è un giorno lavorativo, incrementa il contatore
            IF is_working_day THEN
                working_days_count := working_days_count + 1;
            END IF;
        END IF;
        
        loop_date := loop_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN working_days_count;
END;
$$;


ALTER FUNCTION "public"."test_new_calculation"("start_date" "date", "end_date" "date", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_old_calculation"("start_date" "date", "end_date" "date") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    work_schedule RECORD;
    working_days_count INTEGER := 0;
    loop_date DATE;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    loop_date := start_date;
    WHILE loop_date <= end_date LOOP
        -- Controlla se il giorno è lavorativo secondo la configurazione (LOGICA VECCHIA)
        CASE EXTRACT(DOW FROM loop_date)
            WHEN 0 THEN -- Domenica
                IF work_schedule.sunday THEN working_days_count := working_days_count + 1; END IF;
            WHEN 1 THEN -- Lunedì
                IF work_schedule.monday THEN working_days_count := working_days_count + 1; END IF;
            WHEN 2 THEN -- Martedì
                IF work_schedule.tuesday THEN working_days_count := working_days_count + 1; END IF;
            WHEN 3 THEN -- Mercoledì
                IF work_schedule.wednesday THEN working_days_count := working_days_count + 1; END IF;
            WHEN 4 THEN -- Giovedì
                IF work_schedule.thursday THEN working_days_count := working_days_count + 1; END IF;
            WHEN 5 THEN -- Venerdì
                IF work_schedule.friday THEN working_days_count := working_days_count + 1; END IF;
            WHEN 6 THEN -- Sabato
                IF work_schedule.saturday THEN working_days_count := working_days_count + 1; END IF;
        END CASE;
        
        loop_date := loop_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN working_days_count;
END;
$$;


ALTER FUNCTION "public"."test_old_calculation"("start_date" "date", "end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_attendance_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_attendance_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_company_holidays_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_company_holidays_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_employee_leave_balance_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_employee_leave_balance_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_overtime_records_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_overtime_records_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sick_leaves_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_sick_leaves_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_unified_attendances_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_unified_attendances_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_working_days_tracking_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_working_days_tracking_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_role_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Only allow admin role assignment by existing admins
  IF NEW.role = 'admin' AND OLD.role != 'admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Only admins can assign admin roles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_role_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_sick_leave_dates"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  expected_days INTEGER;
  actual_days INTEGER;
  date_list DATE[];
  loop_date DATE;
  result JSONB;
BEGIN
  -- Calcola i giorni attesi
  expected_days := (p_end_date - p_start_date) + 1;
  
  -- Genera l'array delle date attese
  loop_date := p_start_date;
  WHILE loop_date <= p_end_date LOOP
    date_list := array_append(date_list, loop_date);
    loop_date := loop_date + INTERVAL '1 day';
  END LOOP;
  
  actual_days := array_length(date_list, 1);
  
  -- Costruisce il risultato
  result := jsonb_build_object(
    'user_id', p_user_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'expected_days', expected_days,
    'actual_days', actual_days,
    'date_list', to_jsonb(date_list),
    'is_valid', (expected_days = actual_days),
    'verified_at', now()
  );
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."verify_sick_leave_dates"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_user_data_exists"("user_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    result JSONB;
    documents_count INTEGER := 0;
    attendances_count INTEGER := 0;
    unified_attendances_count INTEGER := 0;
    manual_attendances_count INTEGER := 0;
    leave_requests_count INTEGER := 0;
    leave_balance_count INTEGER := 0;
    notifications_count INTEGER := 0;
    business_trips_count INTEGER := 0;
    sent_notifications_count INTEGER := 0;
    messages_count INTEGER := 0;
    profile_exists BOOLEAN := false;
BEGIN
    -- Verifica documenti
    SELECT COUNT(*) INTO documents_count
    FROM public.documents 
    WHERE user_id = user_uuid OR uploaded_by = user_uuid;
    
    -- Verifica presenze
    SELECT COUNT(*) INTO attendances_count
    FROM public.attendances 
    WHERE user_id = user_uuid;
    
    -- Verifica presenze unificate
    SELECT COUNT(*) INTO unified_attendances_count
    FROM public.unified_attendances 
    WHERE user_id = user_uuid;
    
    -- Verifica presenze manuali
    SELECT COUNT(*) INTO manual_attendances_count
    FROM public.manual_attendances 
    WHERE user_id = user_uuid;
    
    -- Verifica richieste di ferie
    SELECT COUNT(*) INTO leave_requests_count
    FROM public.leave_requests 
    WHERE user_id = user_uuid;
    
    -- Verifica bilanci ferie
    SELECT COUNT(*) INTO leave_balance_count
    FROM public.employee_leave_balance 
    WHERE user_id = user_uuid;
    
    -- Verifica notifiche
    SELECT COUNT(*) INTO notifications_count
    FROM public.notifications 
    WHERE user_id = user_uuid;
    
    -- Verifica viaggi di lavoro
    SELECT COUNT(*) INTO business_trips_count
    FROM public.business_trips 
    WHERE user_id = user_uuid;
    
    -- Verifica notifiche inviate
    SELECT COUNT(*) INTO sent_notifications_count
    FROM public.sent_notifications 
    WHERE recipient_id = user_uuid;
    
    -- Verifica messaggi
    SELECT COUNT(*) INTO messages_count
    FROM public.messages 
    WHERE recipient_id = user_uuid OR sender_id = user_uuid;
    
    -- Verifica se esiste ancora il profilo
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_uuid) INTO profile_exists;
    
    -- Costruisce il risultato
    result := jsonb_build_object(
        'user_id', user_uuid,
        'profile_exists', profile_exists,
        'remaining_data', jsonb_build_object(
            'documents', documents_count,
            'attendances', attendances_count,
            'unified_attendances', unified_attendances_count,
            'manual_attendances', manual_attendances_count,
            'leave_requests', leave_requests_count,
            'leave_balance', leave_balance_count,
            'notifications', notifications_count,
            'business_trips', business_trips_count,
            'sent_notifications', sent_notifications_count,
            'messages', messages_count
        ),
        'has_remaining_data', (
            documents_count > 0 OR 
            attendances_count > 0 OR 
            unified_attendances_count > 0 OR 
            manual_attendances_count > 0 OR 
            leave_requests_count > 0 OR 
            leave_balance_count > 0 OR 
            notifications_count > 0 OR 
            business_trips_count > 0 OR 
            sent_notifications_count > 0 OR 
            messages_count > 0 OR 
            profile_exists
        )
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."verify_user_data_exists"("user_uuid" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "resend_api_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "checkout_enabled" boolean DEFAULT true,
    "company_latitude" double precision,
    "company_longitude" double precision,
    "attendance_radius_meters" integer DEFAULT 500,
    "sender_name" "text",
    "sender_email" "text",
    "reply_to" "text",
    "email_signature" "text",
    "enable_notifications" boolean DEFAULT true,
    "enable_document_notifications" boolean DEFAULT true,
    "enable_attendance_notifications" boolean DEFAULT true,
    "enable_leave_notifications" boolean DEFAULT true,
    "enable_welcome_emails" boolean DEFAULT true,
    "track_opens" boolean DEFAULT true,
    "track_clicks" boolean DEFAULT true,
    "auto_retry" boolean DEFAULT true,
    "max_retries" integer DEFAULT 3,
    "global_logo_url" "text",
    "global_logo_alignment" "text" DEFAULT 'center'::"text",
    "global_logo_size" "text" DEFAULT 'medium'::"text",
    "hide_attendance_history_for_employees" boolean DEFAULT false,
    "attendance_alert_enabled" boolean DEFAULT false,
    "attendance_alert_delay_minutes" integer DEFAULT 30,
    CONSTRAINT "check_global_logo_alignment" CHECK (("global_logo_alignment" = ANY (ARRAY['left'::"text", 'center'::"text", 'right'::"text"]))),
    CONSTRAINT "check_global_logo_size" CHECK (("global_logo_size" = ANY (ARRAY['small'::"text", 'medium'::"text", 'large'::"text"])))
);


ALTER TABLE "public"."admin_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."admin_settings"."hide_attendance_history_for_employees" IS 'Se true, nasconde lo storico presenze ai dipendenti normali';



CREATE TABLE IF NOT EXISTS "public"."app_general_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "app_title" "text" DEFAULT 'SerramentiCorp - Gestione Aziendale'::"text" NOT NULL,
    "app_description" "text" DEFAULT 'Sistema di gestione aziendale per imprese di serramenti'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "max_permission_hours" integer DEFAULT 8
);


ALTER TABLE "public"."app_general_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."app_general_settings"."max_permission_hours" IS 'Numero massimo di ore che un dipendente può richiedere per un singolo permesso. Impostato dall''amministratore.';



CREATE TABLE IF NOT EXISTS "public"."attendance_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "alert_date" "date" NOT NULL,
    "alert_time" time without time zone NOT NULL,
    "expected_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email_sent_at" timestamp with time zone
);


ALTER TABLE "public"."attendance_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_check_triggers" (
    "trigger_date" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "attendance_check_triggers_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."attendance_check_triggers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checkout_enabled" boolean DEFAULT true NOT NULL,
    "company_latitude" double precision,
    "company_longitude" double precision,
    "attendance_radius_meters" integer DEFAULT 500 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."attendance_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "check_in_time" timestamp with time zone,
    "check_out_time" timestamp with time zone,
    "check_in_latitude" double precision,
    "check_in_longitude" double precision,
    "check_out_latitude" double precision,
    "check_out_longitude" double precision,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_business_trip" boolean DEFAULT false,
    "business_trip_id" "uuid"
);


ALTER TABLE "public"."attendances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_trips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "destination" "text" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    CONSTRAINT "business_trips_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."business_trips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_holidays" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_recurring" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."company_holidays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "company_name" "text",
    "logo_url" "text",
    "primary_color" "text" DEFAULT '#007bff'::"text",
    "secondary_color" "text" DEFAULT '#6c757d'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "login_logo_url" "text",
    "login_company_name" "text",
    "login_primary_color" "text" DEFAULT '#2563eb'::"text",
    "login_secondary_color" "text" DEFAULT '#64748b'::"text",
    "login_background_color" "text" DEFAULT '#f1f5f9'::"text",
    "employee_default_logo_url" "text",
    "employee_logo_enabled" boolean DEFAULT true
);


ALTER TABLE "public"."dashboard_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "file_name" "text" NOT NULL,
    "file_size" integer,
    "file_type" "text",
    "file_path" "text" NOT NULL,
    "document_type" "text" NOT NULL,
    "is_personal" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['payslip'::"text", 'transfer'::"text", 'communication'::"text", 'medical_certificate'::"text", 'leave_request'::"text", 'expense_report'::"text", 'contract'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sender_name" "text",
    "template_type" "text" DEFAULT 'generale'::"text" NOT NULL,
    "primary_color" "text" DEFAULT '#007bff'::"text",
    "secondary_color" "text" DEFAULT '#6c757d'::"text",
    "background_color" "text" DEFAULT '#ffffff'::"text",
    "text_color" "text" DEFAULT '#333333'::"text",
    "logo_url" "text",
    "logo_alignment" "text" DEFAULT 'center'::"text",
    "logo_size" "text" DEFAULT 'medium'::"text",
    "footer_text" "text" DEFAULT '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820'::"text",
    "footer_color" "text" DEFAULT '#888888'::"text",
    "header_alignment" "text" DEFAULT 'center'::"text",
    "body_alignment" "text" DEFAULT 'left'::"text",
    "font_family" "text" DEFAULT 'Arial, sans-serif'::"text",
    "font_size" "text" DEFAULT 'medium'::"text",
    "button_color" "text" DEFAULT '#007bff'::"text",
    "button_text_color" "text" DEFAULT '#ffffff'::"text",
    "border_radius" "text" DEFAULT '6px'::"text",
    "details" "text",
    "show_details_button" boolean DEFAULT true,
    "show_leave_details" boolean DEFAULT true,
    "show_admin_notes" boolean DEFAULT true,
    "admin_notes_bg_color" "text" DEFAULT '#f8f9fa'::"text",
    "admin_notes_text_color" "text" DEFAULT '#495057'::"text",
    "leave_details_bg_color" "text" DEFAULT '#e3f2fd'::"text",
    "leave_details_text_color" "text" DEFAULT '#1565c0'::"text",
    "show_custom_block" boolean DEFAULT false,
    "custom_block_text" "text",
    "custom_block_bg_color" "text" DEFAULT '#fff3cd'::"text",
    "custom_block_text_color" "text" DEFAULT '#856404'::"text",
    "template_category" "text" DEFAULT 'generale'::"text",
    "text_alignment" "text" DEFAULT 'left'::"text",
    "subject_editable" boolean DEFAULT true,
    "content_editable" boolean DEFAULT true,
    "show_admin_message" boolean DEFAULT false,
    "admin_message_bg_color" "text" DEFAULT '#e3f2fd'::"text",
    "admin_message_text_color" "text" DEFAULT '#1565c0'::"text",
    "show_admin_notes_section" boolean DEFAULT true,
    "admin_notes_section_bg_color" "text" DEFAULT '#e8f4fd'::"text",
    "admin_notes_section_text_color" "text" DEFAULT '#2c5282'::"text",
    "show_button" boolean DEFAULT false,
    "button_text" "text" DEFAULT 'Accedi alla Dashboard'::"text",
    "button_url" "text" DEFAULT 'https://your-app-url.com'::"text",
    CONSTRAINT "check_body_alignment" CHECK (("body_alignment" = ANY (ARRAY['left'::"text", 'center'::"text", 'right'::"text", 'justify'::"text"]))),
    CONSTRAINT "check_button_text_length" CHECK (("char_length"("button_text") <= 100)),
    CONSTRAINT "check_button_url_length" CHECK (("char_length"("button_url") <= 500)),
    CONSTRAINT "check_font_size" CHECK (("font_size" = ANY (ARRAY['small'::"text", 'medium'::"text", 'large'::"text"]))),
    CONSTRAINT "check_header_alignment" CHECK (("header_alignment" = ANY (ARRAY['left'::"text", 'center'::"text", 'right'::"text"]))),
    CONSTRAINT "check_logo_alignment" CHECK (("logo_alignment" = ANY (ARRAY['left'::"text", 'center'::"text", 'right'::"text"]))),
    CONSTRAINT "check_logo_size" CHECK (("logo_size" = ANY (ARRAY['small'::"text", 'medium'::"text", 'large'::"text"]))),
    CONSTRAINT "check_template_category" CHECK (("template_category" = ANY (ARRAY['dipendenti'::"text", 'amministratori'::"text", 'generale'::"text"]))),
    CONSTRAINT "check_template_type" CHECK (("template_type" = ANY (ARRAY['documenti'::"text", 'notifiche'::"text", 'approvazioni'::"text", 'generale'::"text", 'permessi-richiesta'::"text", 'permessi-approvazione'::"text", 'permessi-rifiuto'::"text", 'ferie-richiesta'::"text", 'ferie-approvazione'::"text", 'ferie-rifiuto'::"text", 'avviso-entrata'::"text"]))),
    CONSTRAINT "check_text_alignment" CHECK (("text_alignment" = ANY (ARRAY['left'::"text", 'center'::"text", 'right'::"text", 'justify'::"text"])))
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_leave_balance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "year" integer DEFAULT EXTRACT(year FROM CURRENT_DATE) NOT NULL,
    "vacation_days_total" integer DEFAULT 0 NOT NULL,
    "vacation_days_used" integer DEFAULT 0 NOT NULL,
    "permission_hours_total" integer DEFAULT 0 NOT NULL,
    "permission_hours_used" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."employee_leave_balance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_logo_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "employee_default_logo_url" "text",
    "employee_logo_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."employee_logo_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_work_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_days" "text"[] NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employee_work_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leave_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "day" "date",
    "time_from" time without time zone,
    "time_to" time without time zone,
    "date_from" "date",
    "date_to" "date",
    "note" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_note" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "notify_employee" boolean DEFAULT true,
    "leave_balance_id" "uuid",
    CONSTRAINT "leave_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "leave_requests_type_check" CHECK (("type" = ANY (ARRAY['ferie'::"text", 'permesso'::"text", 'malattia'::"text"])))
);


ALTER TABLE "public"."leave_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."login_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "logo_url" "text",
    "company_name" "text" DEFAULT 'ALM Infissi'::"text" NOT NULL,
    "primary_color" "text" DEFAULT '#2563eb'::"text" NOT NULL,
    "secondary_color" "text" DEFAULT '#64748b'::"text" NOT NULL,
    "background_color" "text" DEFAULT '#f1f5f9'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."login_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manual_attendances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "check_in_time" timestamp with time zone,
    "check_out_time" timestamp with time zone,
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."manual_attendances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid",
    "recipient_id" "uuid",
    "is_global" boolean DEFAULT false NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."multiple_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "checkin_time" time without time zone NOT NULL,
    "checkout_time" time without time zone,
    "is_second_checkin" boolean DEFAULT false,
    "permission_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."multiple_checkins" OWNER TO "postgres";


COMMENT ON TABLE "public"."multiple_checkins" IS 'Tabella per le multiple registrazioni di entrata quando un dipendente ha un permesso in mezzo alla giornata';



COMMENT ON COLUMN "public"."multiple_checkins"."employee_id" IS 'ID del dipendente';



COMMENT ON COLUMN "public"."multiple_checkins"."date" IS 'Data della registrazione';



COMMENT ON COLUMN "public"."multiple_checkins"."checkin_time" IS 'Ora di entrata';



COMMENT ON COLUMN "public"."multiple_checkins"."checkout_time" IS 'Ora di uscita (opzionale)';



COMMENT ON COLUMN "public"."multiple_checkins"."is_second_checkin" IS 'Indica se è la seconda registrazione dopo un permesso';



COMMENT ON COLUMN "public"."multiple_checkins"."permission_id" IS 'ID del permesso che ha causato la seconda registrazione';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'system'::"text",
    "is_read" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "body" "text",
    "attachment_url" "text",
    "category" "text",
    CONSTRAINT "notifications_category_check" CHECK ((("category" IS NULL) OR ("category" = ANY (ARRAY['Aggiornamenti aziendali'::"text", 'Comunicazioni importanti'::"text", 'Eventi'::"text", 'Avvisi sicurezza'::"text", 'system'::"text", 'document'::"text"])))),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['document'::"text", 'system'::"text", 'message'::"text", 'announcement'::"text", 'Aggiornamenti aziendali'::"text", 'Comunicazioni importanti'::"text", 'Eventi'::"text", 'Avvisi sicurezza'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."overtime_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "hours" numeric(4,2) NOT NULL,
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "overtime_records_hours_check" CHECK (("hours" > (0)::numeric))
);


ALTER TABLE "public"."overtime_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "role" "text" DEFAULT 'employee'::"text" NOT NULL,
    "department" "text",
    "hire_date" "date",
    "employee_code" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tracking_start_type" "text" DEFAULT 'from_hire_date'::"text",
    "first_login" boolean DEFAULT true,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'employee'::"text"]))),
    CONSTRAINT "profiles_tracking_start_type_check" CHECK (("tracking_start_type" = ANY (ARRAY['from_hire_date'::"text", 'from_year_start'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."tracking_start_type" IS 'Tipo di inizio conteggio giorni lavorativi: from_hire_date per nuovi assunti, from_year_start per dipendenti esistenti';



COMMENT ON COLUMN "public"."profiles"."first_login" IS 'Indica se l''utente deve ancora effettuare il primo accesso e cambiare la password assegnata dall''amministratore';



CREATE TABLE IF NOT EXISTS "public"."sent_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "recipient_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "body" "text",
    "type" "text" DEFAULT 'system'::"text" NOT NULL,
    "attachment_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sent_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sick_leaves" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reference_code" "text",
    CONSTRAINT "valid_date_range" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "public"."sick_leaves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unified_attendances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "check_in_time" "text",
    "check_out_time" "text",
    "is_manual" boolean DEFAULT false NOT NULL,
    "is_business_trip" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_sick_leave" boolean DEFAULT false NOT NULL,
    "is_late" boolean DEFAULT false,
    "late_minutes" integer DEFAULT 0
);


ALTER TABLE "public"."unified_attendances" OWNER TO "postgres";


COMMENT ON COLUMN "public"."unified_attendances"."is_sick_leave" IS 'Indica se la presenza è relativa a un giorno di malattia';



COMMENT ON COLUMN "public"."unified_attendances"."is_late" IS 'Indica se il dipendente è arrivato in ritardo';



COMMENT ON COLUMN "public"."unified_attendances"."late_minutes" IS 'Numero di minuti di ritardo rispetto all''orario previsto + tolleranza';



CREATE OR REPLACE VIEW "public"."upcoming_leaves" WITH ("security_invoker"='on') AS
 SELECT "lr"."id",
    "lr"."user_id",
    "lr"."type",
        CASE
            WHEN ("lr"."type" = 'ferie'::"text") THEN "lr"."date_from"
            ELSE "lr"."day"
        END AS "start_date",
        CASE
            WHEN ("lr"."type" = 'ferie'::"text") THEN "lr"."date_to"
            ELSE "lr"."day"
        END AS "end_date",
    "lr"."note",
    "lr"."status",
    "lr"."admin_note",
    "lr"."reviewed_at",
    "lr"."reviewed_by",
    "lr"."date_to",
    "lr"."date_from",
    "lr"."time_to",
    "lr"."time_from",
    "lr"."day",
    "lr"."updated_at",
    "lr"."notify_employee",
    "lr"."leave_balance_id",
    "lr"."created_at",
    "p"."first_name",
    "p"."last_name",
    "p"."email"
   FROM ("public"."leave_requests" "lr"
     JOIN "public"."profiles" "p" ON (("lr"."user_id" = "p"."id")))
  WHERE (("lr"."status" = 'approved'::"text") AND ((("lr"."type" = 'ferie'::"text") AND ("lr"."date_from" >= CURRENT_DATE)) OR (("lr"."type" = 'permesso'::"text") AND ("lr"."day" >= CURRENT_DATE))));


ALTER VIEW "public"."upcoming_leaves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "start_time" time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    "end_time" time without time zone DEFAULT '17:00:00'::time without time zone NOT NULL,
    "monday" boolean DEFAULT true NOT NULL,
    "tuesday" boolean DEFAULT true NOT NULL,
    "wednesday" boolean DEFAULT true NOT NULL,
    "thursday" boolean DEFAULT true NOT NULL,
    "friday" boolean DEFAULT true NOT NULL,
    "saturday" boolean DEFAULT false NOT NULL,
    "sunday" boolean DEFAULT false NOT NULL,
    "tolerance_minutes" integer DEFAULT 15 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."work_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."working_days_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "should_be_tracked" boolean DEFAULT true NOT NULL,
    "tracking_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."working_days_tracking" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_admin_id_unique" UNIQUE ("admin_id");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_general_settings"
    ADD CONSTRAINT "app_general_settings_admin_id_key" UNIQUE ("admin_id");



ALTER TABLE ONLY "public"."app_general_settings"
    ADD CONSTRAINT "app_general_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_alerts"
    ADD CONSTRAINT "attendance_alerts_employee_id_alert_date_key" UNIQUE ("employee_id", "alert_date");



ALTER TABLE ONLY "public"."attendance_alerts"
    ADD CONSTRAINT "attendance_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_check_triggers"
    ADD CONSTRAINT "attendance_check_triggers_pkey" PRIMARY KEY ("trigger_date");



ALTER TABLE ONLY "public"."attendance_settings"
    ADD CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."business_trips"
    ADD CONSTRAINT "business_trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_holidays"
    ADD CONSTRAINT "company_holidays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_settings"
    ADD CONSTRAINT "dashboard_settings_admin_id_key" UNIQUE ("admin_id");



ALTER TABLE ONLY "public"."dashboard_settings"
    ADD CONSTRAINT "dashboard_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_admin_type_category_unique" UNIQUE ("admin_id", "template_type", "template_category");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_leave_balance"
    ADD CONSTRAINT "employee_leave_balance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_leave_balance"
    ADD CONSTRAINT "employee_leave_balance_user_id_year_key" UNIQUE ("user_id", "year");



ALTER TABLE ONLY "public"."employee_logo_settings"
    ADD CONSTRAINT "employee_logo_settings_admin_id_key" UNIQUE ("admin_id");



ALTER TABLE ONLY "public"."employee_logo_settings"
    ADD CONSTRAINT "employee_logo_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_work_schedules"
    ADD CONSTRAINT "employee_work_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."login_settings"
    ADD CONSTRAINT "login_settings_admin_id_key" UNIQUE ("admin_id");



ALTER TABLE ONLY "public"."login_settings"
    ADD CONSTRAINT "login_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manual_attendances"
    ADD CONSTRAINT "manual_attendances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manual_attendances"
    ADD CONSTRAINT "manual_attendances_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."multiple_checkins"
    ADD CONSTRAINT "multiple_checkins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."overtime_records"
    ADD CONSTRAINT "overtime_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_employee_code_key" UNIQUE ("employee_code");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sent_notifications"
    ADD CONSTRAINT "sent_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sick_leaves"
    ADD CONSTRAINT "sick_leaves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unified_attendances"
    ADD CONSTRAINT "unified_attendances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unified_attendances"
    ADD CONSTRAINT "unified_attendances_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."company_holidays"
    ADD CONSTRAINT "unique_admin_date" UNIQUE ("admin_id", "date");



ALTER TABLE ONLY "public"."sick_leaves"
    ADD CONSTRAINT "unique_user_date_range" UNIQUE ("user_id", "start_date", "end_date");



ALTER TABLE ONLY "public"."work_schedules"
    ADD CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."working_days_tracking"
    ADD CONSTRAINT "working_days_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."working_days_tracking"
    ADD CONSTRAINT "working_days_tracking_user_id_date_key" UNIQUE ("user_id", "date");



CREATE INDEX "idx_attendance_alerts_date" ON "public"."attendance_alerts" USING "btree" ("alert_date");



CREATE INDEX "idx_attendance_alerts_employee" ON "public"."attendance_alerts" USING "btree" ("employee_id");



CREATE INDEX "idx_company_holidays_admin_id" ON "public"."company_holidays" USING "btree" ("admin_id");



CREATE INDEX "idx_company_holidays_date" ON "public"."company_holidays" USING "btree" ("date");



CREATE INDEX "idx_company_holidays_recurring" ON "public"."company_holidays" USING "btree" ("is_recurring");



CREATE INDEX "idx_email_templates_admin_type" ON "public"."email_templates" USING "btree" ("admin_id", "template_type");



CREATE INDEX "idx_email_templates_category_type" ON "public"."email_templates" USING "btree" ("admin_id", "template_category", "template_type");



CREATE INDEX "idx_employee_leave_balance_user_year" ON "public"."employee_leave_balance" USING "btree" ("user_id", "year");



CREATE INDEX "idx_leave_requests_user_year" ON "public"."leave_requests" USING "btree" ("user_id", EXTRACT(year FROM COALESCE("date_from", "day")));



CREATE INDEX "idx_multiple_checkins_employee_date" ON "public"."multiple_checkins" USING "btree" ("employee_id", "date");



CREATE INDEX "idx_multiple_checkins_permission" ON "public"."multiple_checkins" USING "btree" ("permission_id");



CREATE INDEX "idx_profiles_first_login" ON "public"."profiles" USING "btree" ("first_login");



CREATE INDEX "idx_unified_attendances_date" ON "public"."unified_attendances" USING "btree" ("date");



CREATE INDEX "idx_unified_attendances_sick_leave" ON "public"."unified_attendances" USING "btree" ("is_sick_leave") WHERE ("is_sick_leave" = true);



CREATE INDEX "idx_unified_attendances_user_date" ON "public"."unified_attendances" USING "btree" ("user_id", "date");



CREATE UNIQUE INDEX "unique_employee_work_schedule" ON "public"."employee_work_schedules" USING "btree" ("employee_id");



CREATE OR REPLACE TRIGGER "app_general_settings_updated_at" BEFORE UPDATE ON "public"."app_general_settings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_app_general_settings_updated_at"();



CREATE OR REPLACE TRIGGER "documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "employee_leave_balance_updated_at" BEFORE UPDATE ON "public"."employee_leave_balance" FOR EACH ROW EXECUTE FUNCTION "public"."update_employee_leave_balance_updated_at"();



CREATE OR REPLACE TRIGGER "employee_logo_settings_updated_at" BEFORE UPDATE ON "public"."employee_logo_settings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_multiple_checkins_updated_at" BEFORE UPDATE ON "public"."multiple_checkins" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."attendance_check_triggers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."attendances" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."email_templates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_business_trips" BEFORE UPDATE ON "public"."business_trips" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_manual_attendances" BEFORE UPDATE ON "public"."manual_attendances" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_sent_notifications" BEFORE UPDATE ON "public"."sent_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "leave_deletion_trigger" BEFORE DELETE ON "public"."leave_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_leave_deletion"();



CREATE OR REPLACE TRIGGER "leave_usage_trigger" AFTER INSERT OR UPDATE ON "public"."leave_requests" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_leave_usage"();



CREATE OR REPLACE TRIGGER "login_settings_updated_at" BEFORE UPDATE ON "public"."login_settings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_auto_generate_sick_leave_reference" BEFORE INSERT ON "public"."sick_leaves" FOR EACH ROW EXECUTE FUNCTION "public"."auto_generate_sick_leave_reference"();



CREATE OR REPLACE TRIGGER "trigger_update_unified_attendances_updated_at" BEFORE UPDATE ON "public"."unified_attendances" FOR EACH ROW EXECUTE FUNCTION "public"."update_unified_attendances_updated_at"();



CREATE OR REPLACE TRIGGER "update_attendance_settings_updated_at" BEFORE UPDATE ON "public"."attendance_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_attendance_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_company_holidays_updated_at" BEFORE UPDATE ON "public"."company_holidays" FOR EACH ROW EXECUTE FUNCTION "public"."update_company_holidays_updated_at"();



CREATE OR REPLACE TRIGGER "update_overtime_records_updated_at" BEFORE UPDATE ON "public"."overtime_records" FOR EACH ROW EXECUTE FUNCTION "public"."update_overtime_records_updated_at"();



CREATE OR REPLACE TRIGGER "update_sick_leaves_updated_at" BEFORE UPDATE ON "public"."sick_leaves" FOR EACH ROW EXECUTE FUNCTION "public"."update_sick_leaves_updated_at"();



CREATE OR REPLACE TRIGGER "update_work_schedules_updated_at" BEFORE UPDATE ON "public"."work_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "validate_role_assignment_trigger" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_role_assignment"();



CREATE OR REPLACE TRIGGER "working_days_tracking_updated_at" BEFORE UPDATE ON "public"."working_days_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."update_working_days_tracking_updated_at"();



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_general_settings"
    ADD CONSTRAINT "app_general_settings_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_alerts"
    ADD CONSTRAINT "attendance_alerts_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_alerts"
    ADD CONSTRAINT "attendance_alerts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_business_trip_id_fkey" FOREIGN KEY ("business_trip_id") REFERENCES "public"."business_trips"("id");



ALTER TABLE ONLY "public"."attendances"
    ADD CONSTRAINT "attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."dashboard_settings"
    ADD CONSTRAINT "dashboard_settings_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_leave_balance"
    ADD CONSTRAINT "employee_leave_balance_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."employee_leave_balance"
    ADD CONSTRAINT "employee_leave_balance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_logo_settings"
    ADD CONSTRAINT "employee_logo_settings_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_work_schedules"
    ADD CONSTRAINT "employee_work_schedules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_leave_balance_id_fkey" FOREIGN KEY ("leave_balance_id") REFERENCES "public"."employee_leave_balance"("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."login_settings"
    ADD CONSTRAINT "login_settings_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."multiple_checkins"
    ADD CONSTRAINT "multiple_checkins_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."multiple_checkins"
    ADD CONSTRAINT "multiple_checkins_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."leave_requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."overtime_records"
    ADD CONSTRAINT "overtime_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sick_leaves"
    ADD CONSTRAINT "sick_leaves_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."sick_leaves"
    ADD CONSTRAINT "sick_leaves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."working_days_tracking"
    ADD CONSTRAINT "working_days_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can insert sent notifications" ON "public"."sent_notifications" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))) AND ("admin_id" = "auth"."uid"())));



CREATE POLICY "Admin can view own sent notifications" ON "public"."sent_notifications" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))) AND ("admin_id" = "auth"."uid"())));



CREATE POLICY "Admin can view sent notifications" ON "public"."notifications" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Admins can create attendances for others" ON "public"."attendances" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can create business trips for others" ON "public"."business_trips" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete all attendances" ON "public"."attendances" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete all business trips" ON "public"."business_trips" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins can delete all checkins" ON "public"."multiple_checkins" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete their app general settings" ON "public"."app_general_settings" FOR DELETE USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Admins can delete their email templates" ON "public"."email_templates" FOR DELETE USING (("admin_id" = "auth"."uid"()));



CREATE POLICY "Admins can delete their own company holidays" ON "public"."company_holidays" FOR DELETE USING ((("admin_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Admins can delete their own employee logo settings" ON "public"."employee_logo_settings" FOR DELETE USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Admins can delete their own login settings" ON "public"."login_settings" FOR DELETE USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Admins can delete their settings" ON "public"."admin_settings" FOR DELETE USING (("admin_id" = "auth"."uid"()));



CREATE POLICY "Admins can delete their templates" ON "public"."email_templates" FOR DELETE USING (("admin_id" = "auth"."uid"()));



CREATE POLICY "Admins can insert all checkins" ON "public"."multiple_checkins" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert profiles" ON "public"."profiles" FOR INSERT WITH CHECK (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins can insert their app general settings" ON "public"."app_general_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "admin_id"));



CREATE POLICY "Admins can insert their email templates" ON "public"."email_templates" FOR INSERT WITH CHECK (("admin_id" = "auth"."uid"()));



CREATE POLICY "Admins can insert their own company holidays" ON "public"."company_holidays" FOR INSERT WITH CHECK ((("admin_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Admins can insert their own employee logo settings" ON "public"."employee_logo_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "admin_id"));



CREATE POLICY "Admins can insert their own login settings" ON "public"."login_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "admin_id"));



CREATE POLICY "Admins can insert their settings" ON "public"."admin_settings" FOR INSERT WITH CHECK (("admin_id" = "auth"."uid"()));



CREATE POLICY "Admins can insert their templates" ON "public"."email_templates" FOR INSERT WITH CHECK (("admin_id" = "auth"."uid"()));



CREATE POLICY "Admins can manage all employee work schedules" ON "public"."employee_work_schedules" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage all overtime records" ON "public"."overtime_records" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage all sick leaves" ON "public"."sick_leaves" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage all working days tracking" ON "public"."working_days_tracking" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage their dashboard settings" ON "public"."dashboard_settings" USING (("admin_id" = "auth"."uid"()));



CREATE POLICY "Admins can manage unified attendances" ON "public"."unified_attendances" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update all attendances" ON "public"."attendances" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update all business trips" ON "public"."business_trips" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update all checkins" ON "public"."multiple_checkins" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update all profiles" ON "public"."profiles" FOR UPDATE USING (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins can update their app general settings" ON "public"."app_general_settings" FOR UPDATE USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Admins can update their email templates" ON "public"."email_templates" FOR UPDATE USING (("admin_id" = "auth"."uid"()));



CREATE POLICY "Admins can update their own company holidays" ON "public"."company_holidays" FOR UPDATE USING ((("admin_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Admins can update their own employee logo settings" ON "public"."employee_logo_settings" FOR UPDATE USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Admins can update their own login settings" ON "public"."login_settings" FOR UPDATE USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Admins can update their settings" ON "public"."admin_settings" FOR UPDATE USING (("admin_id" = "auth"."uid"())) WITH CHECK (("admin_id" = "auth"."uid"()));



CREATE POLICY "Admins can update their templates" ON "public"."email_templates" FOR UPDATE USING (("admin_id" = "auth"."uid"()));



CREATE POLICY "Admins can upload documents for users" ON "public"."documents" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all attendance alerts" ON "public"."attendance_alerts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all attendances" ON "public"."attendances" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all business trips" ON "public"."business_trips" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all checkins" ON "public"."multiple_checkins" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all documents" ON "public"."documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT USING (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins can view all unified attendances" ON "public"."unified_attendances" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view their app general settings" ON "public"."app_general_settings" FOR SELECT USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Admins can view their email templates" ON "public"."email_templates" FOR SELECT USING (("admin_id" = "auth"."uid"()));



CREATE POLICY "Admins can view their own company holidays" ON "public"."company_holidays" FOR SELECT USING ((("admin_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Admins can view their own employee logo settings" ON "public"."employee_logo_settings" FOR SELECT USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Admins can view their own login settings" ON "public"."login_settings" FOR SELECT USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Admins can view their settings" ON "public"."admin_settings" FOR SELECT USING (("admin_id" = "auth"."uid"()));



CREATE POLICY "Admins can view their templates" ON "public"."email_templates" FOR SELECT USING (("admin_id" = "auth"."uid"()));



CREATE POLICY "All authenticated users can view attendance settings" ON "public"."attendance_settings" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "All authenticated users can view work schedules" ON "public"."work_schedules" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to delete their own profile" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Allow authenticated users to insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Allow authenticated users to select their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Allow authenticated users to update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Allow profile creation" ON "public"."profiles" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow users to read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow users to update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Employees can view company documents" ON "public"."documents" FOR SELECT USING (("is_personal" = false));



CREATE POLICY "Employees can view company holidays" ON "public"."company_holidays" FOR SELECT USING (true);



CREATE POLICY "Employees can view their own work schedules" ON "public"."employee_work_schedules" FOR SELECT USING (("employee_id" = "auth"."uid"()));



CREATE POLICY "Only admin can delete" ON "public"."messages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Only admin can insert" ON "public"."messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage manual attendances" ON "public"."manual_attendances" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can modify attendance settings" ON "public"."attendance_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can modify work schedules" ON "public"."work_schedules" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Public can view app general settings" ON "public"."app_general_settings" FOR SELECT USING (true);



CREATE POLICY "Public can view employee logo settings" ON "public"."employee_logo_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public can view login settings for login page" ON "public"."login_settings" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Read own or global messages" ON "public"."messages" FOR SELECT USING ((("recipient_id" = "auth"."uid"()) OR ("is_global" = true)));



CREATE POLICY "System can insert attendance alerts" ON "public"."attendance_alerts" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can manage attendance check triggers" ON "public"."attendance_check_triggers" USING (true) WITH CHECK (true);



CREATE POLICY "Update read state" ON "public"."messages" FOR UPDATE USING (("recipient_id" = "auth"."uid"())) WITH CHECK (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Users can create their own attendances" ON "public"."attendances" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own business trips" ON "public"."business_trips" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can delete their own checkins" ON "public"."multiple_checkins" FOR DELETE USING (("auth"."uid"() = "employee_id"));



CREATE POLICY "Users can delete their own today attendances" ON "public"."attendances" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("date" = CURRENT_DATE)));



CREATE POLICY "Users can insert their own checkins" ON "public"."multiple_checkins" FOR INSERT WITH CHECK (("auth"."uid"() = "employee_id"));



CREATE POLICY "Users can manage own unified attendances" ON "public"."unified_attendances" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own attendances" ON "public"."attendances" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own checkins" ON "public"."multiple_checkins" FOR UPDATE USING (("auth"."uid"() = "employee_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own pending business trips" ON "public"."business_trips" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can upload documents" ON "public"."documents" FOR INSERT WITH CHECK ((("auth"."uid"() = "uploaded_by") AND ((("is_personal" = true) AND ("user_id" = "auth"."uid"())) OR ("is_personal" = false))));



CREATE POLICY "Users can view manual attendances" ON "public"."manual_attendances" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can view own and global notifications" ON "public"."notifications" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("user_id" IS NULL)));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can view own unified attendances" ON "public"."unified_attendances" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own attendances" ON "public"."attendances" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own business trips" ON "public"."business_trips" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own checkins" ON "public"."multiple_checkins" FOR SELECT USING (("auth"."uid"() = "employee_id"));



CREATE POLICY "Users can view their own documents" ON "public"."documents" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own overtime records" ON "public"."overtime_records" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own sick leaves" ON "public"."sick_leaves" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own working days tracking" ON "public"."working_days_tracking" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admin can insert" ON "public"."leave_requests" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin can manage leave balances" ON "public"."employee_leave_balance" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin can select all" ON "public"."leave_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin can update" ON "public"."leave_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin can update status" ON "public"."leave_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "admin can view all leave balances" ON "public"."employee_leave_balance" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



ALTER TABLE "public"."admin_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_general_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_check_triggers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_trips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_holidays" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_leave_balance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_logo_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_work_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leave_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."login_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."manual_attendances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."multiple_checkins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."overtime_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sent_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sick_leaves" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."unified_attendances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can delete their own leave requests" ON "public"."leave_requests" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "users can insert their own leave requests" ON "public"."leave_requests" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users can view own leave balance" ON "public"."employee_leave_balance" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users can view their own leave requests" ON "public"."leave_requests" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



ALTER TABLE "public"."work_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."working_days_tracking" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."attendance_monitor_cron"() TO "anon";
GRANT ALL ON FUNCTION "public"."attendance_monitor_cron"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."attendance_monitor_cron"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_generate_sick_leave_reference"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_sick_leave_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_sick_leave_reference"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_leave_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_leave_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_leave_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_missing_attendance_simple"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_missing_attendance_simple"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_missing_attendance_simple"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_sick_leave_overlaps"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_exclude_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_sick_leave_overlaps"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_exclude_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_sick_leave_overlaps"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_exclude_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_user_data"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."clear_user_data"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_user_data"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_user_cleanup"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_user_cleanup"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_user_cleanup"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."completo_attendance_check"() TO "anon";
GRANT ALL ON FUNCTION "public"."completo_attendance_check"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."completo_attendance_check"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_leave_calculation"("p_date_from" "date", "p_date_to" "date", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_leave_calculation"("p_date_from" "date", "p_date_to" "date", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_leave_calculation"("p_date_from" "date", "p_date_to" "date", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_sick_leave_reference_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_sick_leave_reference_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_sick_leave_reference_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_users_storage_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_users_storage_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_users_storage_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_correct_day_of_week"("input_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_correct_day_of_week"("input_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_correct_day_of_week"("input_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_upcoming_leaves"("days_ahead" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_upcoming_leaves"("days_ahead" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_upcoming_leaves"("days_ahead" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_storage_usage"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_storage_usage"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_storage_usage"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_app_general_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_app_general_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_app_general_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_leave_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_leave_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_leave_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "postgres";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "anon";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_employee_code_unique"("code" "text", "exclude_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_employee_code_unique"("code" "text", "exclude_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_employee_code_unique"("code" "text", "exclude_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_working_days_for_user"("target_user_id" "uuid", "start_date" "date", "end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."populate_working_days_for_user"("target_user_id" "uuid", "start_date" "date", "end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_working_days_for_user"("target_user_id" "uuid", "start_date" "date", "end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_all_leave_balances"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_all_leave_balances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_all_leave_balances"() TO "service_role";



GRANT ALL ON FUNCTION "public"."robusto_attendance_check"() TO "anon";
GRANT ALL ON FUNCTION "public"."robusto_attendance_check"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."robusto_attendance_check"() TO "service_role";



GRANT ALL ON FUNCTION "public"."schedule_attendance_alerts"() TO "anon";
GRANT ALL ON FUNCTION "public"."schedule_attendance_alerts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_attendance_alerts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."should_track_employee_on_date"("target_user_id" "uuid", "check_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."should_track_employee_on_date"("target_user_id" "uuid", "check_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."should_track_employee_on_date"("target_user_id" "uuid", "check_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_date_calculation"("test_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."test_date_calculation"("test_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_date_calculation"("test_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_new_calculation"("start_date" "date", "end_date" "date", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."test_new_calculation"("start_date" "date", "end_date" "date", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_new_calculation"("start_date" "date", "end_date" "date", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_old_calculation"("start_date" "date", "end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."test_old_calculation"("start_date" "date", "end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_old_calculation"("start_date" "date", "end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_attendance_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_attendance_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_attendance_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_company_holidays_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_company_holidays_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_company_holidays_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_employee_leave_balance_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_employee_leave_balance_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_employee_leave_balance_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_overtime_records_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_overtime_records_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_overtime_records_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sick_leaves_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_sick_leaves_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sick_leaves_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_unified_attendances_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_unified_attendances_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_unified_attendances_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_working_days_tracking_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_working_days_tracking_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_working_days_tracking_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_role_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_role_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_role_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_sick_leave_dates"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_sick_leave_dates"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_sick_leave_dates"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_user_data_exists"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_user_data_exists"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_user_data_exists"("user_uuid" "uuid") TO "service_role";
























GRANT ALL ON TABLE "public"."admin_settings" TO "anon";
GRANT ALL ON TABLE "public"."admin_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_settings" TO "service_role";



GRANT ALL ON TABLE "public"."app_general_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_general_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_general_settings" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_alerts" TO "anon";
GRANT ALL ON TABLE "public"."attendance_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_check_triggers" TO "anon";
GRANT ALL ON TABLE "public"."attendance_check_triggers" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_check_triggers" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_settings" TO "anon";
GRANT ALL ON TABLE "public"."attendance_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_settings" TO "service_role";



GRANT ALL ON TABLE "public"."attendances" TO "anon";
GRANT ALL ON TABLE "public"."attendances" TO "authenticated";
GRANT ALL ON TABLE "public"."attendances" TO "service_role";



GRANT ALL ON TABLE "public"."business_trips" TO "anon";
GRANT ALL ON TABLE "public"."business_trips" TO "authenticated";
GRANT ALL ON TABLE "public"."business_trips" TO "service_role";



GRANT ALL ON TABLE "public"."company_holidays" TO "anon";
GRANT ALL ON TABLE "public"."company_holidays" TO "authenticated";
GRANT ALL ON TABLE "public"."company_holidays" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_settings" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_settings" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."employee_leave_balance" TO "anon";
GRANT ALL ON TABLE "public"."employee_leave_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_leave_balance" TO "service_role";



GRANT ALL ON TABLE "public"."employee_logo_settings" TO "anon";
GRANT ALL ON TABLE "public"."employee_logo_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_logo_settings" TO "service_role";



GRANT ALL ON TABLE "public"."employee_work_schedules" TO "anon";
GRANT ALL ON TABLE "public"."employee_work_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_work_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."leave_requests" TO "anon";
GRANT ALL ON TABLE "public"."leave_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_requests" TO "service_role";



GRANT ALL ON TABLE "public"."login_settings" TO "anon";
GRANT ALL ON TABLE "public"."login_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."login_settings" TO "service_role";



GRANT ALL ON TABLE "public"."manual_attendances" TO "anon";
GRANT ALL ON TABLE "public"."manual_attendances" TO "authenticated";
GRANT ALL ON TABLE "public"."manual_attendances" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."multiple_checkins" TO "anon";
GRANT ALL ON TABLE "public"."multiple_checkins" TO "authenticated";
GRANT ALL ON TABLE "public"."multiple_checkins" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."overtime_records" TO "anon";
GRANT ALL ON TABLE "public"."overtime_records" TO "authenticated";
GRANT ALL ON TABLE "public"."overtime_records" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."sent_notifications" TO "anon";
GRANT ALL ON TABLE "public"."sent_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."sent_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."sick_leaves" TO "anon";
GRANT ALL ON TABLE "public"."sick_leaves" TO "authenticated";
GRANT ALL ON TABLE "public"."sick_leaves" TO "service_role";



GRANT ALL ON TABLE "public"."unified_attendances" TO "anon";
GRANT ALL ON TABLE "public"."unified_attendances" TO "authenticated";
GRANT ALL ON TABLE "public"."unified_attendances" TO "service_role";



GRANT ALL ON TABLE "public"."upcoming_leaves" TO "anon";
GRANT ALL ON TABLE "public"."upcoming_leaves" TO "authenticated";
GRANT ALL ON TABLE "public"."upcoming_leaves" TO "service_role";



GRANT ALL ON TABLE "public"."work_schedules" TO "anon";
GRANT ALL ON TABLE "public"."work_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."work_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."working_days_tracking" TO "anon";
GRANT ALL ON TABLE "public"."working_days_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."working_days_tracking" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
