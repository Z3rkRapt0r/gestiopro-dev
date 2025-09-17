-- =========================================
-- 🔐 CORREZIONE AUTENTICAZIONE EDGE FUNCTION
-- =========================================

-- Aggiorna la funzione PostgreSQL per usare il service role key
-- IMPORTANTE: Sostituisci 'YOUR_SERVICE_ROLE_KEY_HERE' con la tua chiave service_role dal dashboard Supabase

CREATE OR REPLACE FUNCTION public.robusto_attendance_check()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- ... (tutte le variabili esistenti) ...
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
BEGIN
    -- ... (tutto il codice esistente fino alla chiamata Edge function) ...

    -- Se ci sono avvisi da inviare, chiama l'Edge function che INVIA solo gli avvisi esistenti
    IF alerts_created > 0 OR pending_alerts > 0 THEN
        RAISE NOTICE 'Chiamata Edge function check-missing-attendance per inviare % avvisi pendenti', alerts_created + pending_alerts;

        BEGIN
            -- Chiama l'Edge function usando il SERVICE ROLE KEY (interno a Supabase)
            SELECT content INTO edge_response
            FROM http((
                'POST',
                'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
                ARRAY[
                    http_header('Content-Type', 'application/json'),
                    http_header('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE')
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

    -- ... (resto del codice esistente) ...
END;
$$;
