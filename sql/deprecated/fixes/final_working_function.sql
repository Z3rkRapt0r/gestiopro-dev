-- =========================================
-- ✅ VERSIONE FINALE FUNZIONANTE - FIX CASE ERROR
-- =========================================

CREATE OR REPLACE FUNCTION public.robusto_attendance_check()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Dichiarazioni esistenti
    edge_response text := '';
    current_timestamp_val timestamp := now() at time zone 'Europe/Rome';
    current_day_name text;
    current_date_str text;
    current_time_str text;
    admin_count integer;
    total_employees integer;
    pending_alerts integer := 0;
    alerts_created integer := 0;
    alert_count integer;
    is_working_day boolean;
    expected_start_time time;
    employee_name text;
    result_message text := '';
    company_start_hour integer;
    company_end_hour integer;
    check_start_hour integer;
    check_end_hour integer;
    current_hour integer;
    
    -- DICHIARAZIONI RECORD PER I CICLI FOR
    admin_record RECORD;
    employee_record RECORD;
BEGIN
    -- Inizializzazione - FIX: Usa il nome corretto del giorno
    current_day_name := lower(to_char(current_timestamp_val, 'Day'));
    current_day_name := trim(current_day_name); -- Rimuovi spazi
    current_date_str := to_char(current_timestamp_val, 'YYYY-MM-DD');
    current_time_str := to_char(current_timestamp_val, 'HH24:MI:SS');

    -- Conta amministratori abilitati e dipendenti attivi
    SELECT COUNT(*) INTO admin_count
    FROM admin_settings
    WHERE attendance_alert_enabled = true;

    SELECT COUNT(*) INTO total_employees
    FROM profiles
    WHERE role = 'employee' AND is_active = true;

    RAISE NOTICE 'Inizio controllo presenze: % admin abilitati, % dipendenti attivi, giorno: %',
        admin_count, total_employees, current_day_name;

    -- NUOVO: Controllo globale degli orari aziendali
    SELECT EXTRACT(hour FROM start_time), EXTRACT(hour FROM end_time)
    INTO company_start_hour, company_end_hour
    FROM work_schedules
    LIMIT 1;

    IF company_start_hour IS NULL OR company_end_hour IS NULL THEN
        company_start_hour := 8; -- 08:00 default
        company_end_hour := 17;  -- 17:00 default
        RAISE NOTICE 'Usando orari aziendali di default: %:00 - %:00', company_start_hour, company_end_hour;
    END IF;

    check_start_hour := GREATEST(0, company_start_hour - 1);
    check_end_hour := LEAST(23, company_end_hour + 2);
    current_hour := EXTRACT(hour FROM current_timestamp_val);

    RAISE NOTICE 'Orari aziendali: %:00-%:00, controllo: %:00-%:00, ora attuale: %:00',
        company_start_hour, company_end_hour, check_start_hour, check_end_hour, current_hour;

    IF current_hour < check_start_hour OR current_hour > check_end_hour THEN
        result_message := 'Fuori orario aziendale (' || current_hour || ':00 non in ' || check_start_hour || ':00-' || check_end_hour || ':00) - controllo saltato alle ' || current_timestamp_val;
        RAISE NOTICE '%', result_message;
        RETURN result_message;
    END IF;

    -- Verifica se dobbiamo controllare oggi (nessun trigger attivo)
    SELECT COUNT(*) INTO pending_alerts
    FROM attendance_check_triggers
    WHERE trigger_date = current_date_str::date
    AND status = 'completed';

    IF pending_alerts > 0 THEN
        result_message := 'Controllo già completato per oggi alle ' || current_timestamp_val;
        RAISE NOTICE '%', result_message;
        RETURN result_message;
    END IF;

    -- Ciclo per ogni amministratore abilitato
    FOR admin_record IN
        SELECT id as admin_id, attendance_alert_delay_minutes, resend_api_key, sender_name, sender_email
        FROM admin_settings
        WHERE attendance_alert_enabled = true
    LOOP
        -- Ciclo per ogni dipendente attivo
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
            employee_name := employee_record.first_name || ' ' || employee_record.last_name;

            -- Determina se il dipendente lavora oggi e a che ora
            is_working_day := false;

            IF employee_record.work_days IS NOT NULL THEN
                -- ORARI PERSONALI
                is_working_day := current_day_name = ANY(employee_record.work_days);
                expected_start_time := employee_record.emp_start_time;
                RAISE NOTICE '% usa ORARI PERSONALI - giorni lavoro: %, oggi %: %',
                    employee_name, employee_record.work_days, current_day_name, CASE WHEN is_working_day THEN 'LAVORA' ELSE 'RIPOSA' END;
            ELSE
                -- ORARI AZIENDALI - FIX: Gestione corretta dei giorni della settimana
                CASE lower(trim(current_day_name))
                    WHEN 'monday' THEN is_working_day := employee_record.monday;
                    WHEN 'tuesday' THEN is_working_day := employee_record.tuesday;
                    WHEN 'wednesday' THEN is_working_day := employee_record.wednesday;
                    WHEN 'thursday' THEN is_working_day := employee_record.thursday;
                    WHEN 'friday' THEN is_working_day := employee_record.friday;
                    WHEN 'saturday' THEN is_working_day := employee_record.saturday;
                    WHEN 'sunday' THEN is_working_day := employee_record.sunday;
                    ELSE 
                        is_working_day := false;
                        RAISE NOTICE 'Giorno della settimana non riconosciuto: %, impostato riposo', current_day_name;
                END CASE;
                expected_start_time := employee_record.company_start_time;
                RAISE NOTICE '% usa ORARI AZIENDALI - oggi %: %',
                    employee_name, current_day_name, CASE WHEN is_working_day THEN 'LAVORA' ELSE 'RIPOSA' END;
            END IF;

            -- Se non lavora oggi, passa al prossimo
            IF NOT is_working_day THEN
                RAISE NOTICE '% non lavora oggi', employee_name;
                CONTINUE;
            END IF;

            -- Verifica se è in ferie/permesso oggi
            SELECT COUNT(*) INTO alert_count
            FROM leave_requests lr
            WHERE lr.employee_id = employee_record.id
            AND lr.status = 'approved'
            AND current_date_str::date BETWEEN lr.start_date AND lr.end_date;

            IF alert_count > 0 THEN
                RAISE NOTICE '% è in ferie/permesso oggi', employee_name;
                CONTINUE;
            END IF;

            -- Verifica se ha già fatto il check-in oggi
            SELECT COUNT(*) INTO alert_count
            FROM attendances
            WHERE employee_id = employee_record.id
            AND DATE(check_in_time) = current_date_str::date;

            IF alert_count > 0 THEN
                RAISE NOTICE '% ha già fatto check-in oggi', employee_name;
                CONTINUE;
            END IF;

            -- Verifica se è passato abbastanza tempo dall'orario previsto
            IF current_timestamp_val < (current_date_str || ' ' || expected_start_time)::timestamp + (admin_record.attendance_alert_delay_minutes || ' minutes')::interval THEN
                RAISE NOTICE '% non ancora in ritardo (previsto: %, attuale: %)', employee_name, expected_start_time, current_time_str;
                CONTINUE;
            END IF;

            -- Verifica se abbiamo già creato un avviso per questo dipendente oggi
            SELECT COUNT(*) INTO alert_count
            FROM attendance_alerts
            WHERE employee_id = employee_record.id
            AND alert_date = current_date_str::date;

            IF alert_count > 0 THEN
                RAISE NOTICE '% ha già un avviso oggi', employee_name;
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

    -- Controllo che avviene DOPO il calcolo delle variabili
    IF alerts_created > 0 OR pending_alerts > 0 THEN
        RAISE NOTICE 'Chiamata Edge function check-missing-attendance per inviare % avvisi pendenti', alerts_created + pending_alerts;

        BEGIN
            -- Chiama l'Edge function usando il SERVICE ROLE KEY
            SELECT content INTO edge_response
            FROM http((
                'POST',
                'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
                ARRAY[
                    http_header('Content-Type', 'application/json'),
                    http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg5MTI3NiwiZXhwIjoyMDY1NDY3Mjc2fQ.jbXMlI5J5sURH4oBLhm6bvTJa0G5ur_BEHNcedq4_co')
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
        RAISE NOTICE 'Nessun avviso da creare o inviare';
        edge_response := 'Nessun avviso creato o da inviare';
    END IF;

    -- Crea il trigger per oggi come completato
    INSERT INTO attendance_check_triggers (trigger_date, status, execution_time, alerts_created, edge_function_response)
    VALUES (current_date_str::date, 'completed', current_timestamp_val, alerts_created, edge_response)
    ON CONFLICT (trigger_date) DO UPDATE SET
        status = 'completed',
        execution_time = current_timestamp_val,
        alerts_created = EXCLUDED.alerts_created,
        edge_function_response = EXCLUDED.edge_function_response;

    -- Messaggio finale
    result_message := 'Controllo completato alle ' || current_timestamp_val || ': ' || alerts_created || ' avvisi creati, risposta Edge function: ' || edge_response;
    RAISE NOTICE '%', result_message;

    RETURN result_message;
END;
$$;
