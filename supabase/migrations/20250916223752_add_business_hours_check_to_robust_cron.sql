-- Aggiunge controllo degli orari aziendali alla funzione robusto_attendance_check
-- per evitare esecuzioni inutili fuori orario

CREATE OR REPLACE FUNCTION public.robusto_attendance_check()
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
            result_message := 'Nessun admin con controllo presenze abilitato alle ' || current_timestamp_val ||
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

        result_message := 'Controllo completato alle ' || current_timestamp_val ||
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
