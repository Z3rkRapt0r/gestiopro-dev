-- ============================================================================
-- FIX EMAIL TRIGGERS - Correzione payload per Edge Functions
-- ============================================================================
-- I trigger precedenti inviavano payload errati. Questa migration li corregge.
-- ============================================================================

-- ============================================================================
-- 1. TRIGGER: Invio email benvenuto nuovo dipendente
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_new_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_supabase_url text;
    v_service_role_key text;
    v_response text;
BEGIN
    -- Solo se il ruolo è employee
    IF NEW.role = 'employee' THEN
        -- Ottieni configurazione Supabase
        SELECT project_ref, service_role_key
        INTO v_supabase_url, v_service_role_key
        FROM app_config
        WHERE id = 1;

        IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
            -- Costruisci URL completo
            IF NOT v_supabase_url LIKE 'http%' THEN
                v_supabase_url := 'https://' || v_supabase_url || '.supabase.co';
            END IF;

            -- Chiama Edge Function per inviare email di benvenuto
            BEGIN
                SELECT content INTO v_response
                FROM http((
                    'POST',
                    v_supabase_url || '/functions/v1/send-welcome-email',
                    ARRAY[
                        http_header('Content-Type', 'application/json'),
                        http_header('Authorization', 'Bearer ' || v_service_role_key)
                    ],
                    'application/json',
                    json_build_object(
                        'employeeId', NEW.id,
                        'email', NEW.email,
                        'firstName', COALESCE(NEW.first_name, ''),
                        'lastName', COALESCE(NEW.last_name, '')
                    )::text
                ));

                RAISE NOTICE 'Email benvenuto dipendente inviata: %', v_response;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Errore invio email benvenuto dipendente: %', SQLERRM;
            END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. TRIGGER: Invio email richiesta ferie/permessi
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_leave_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_supabase_url text;
    v_service_role_key text;
    v_response text;
    v_employee_name text;
    v_leave_type text;
    v_leave_details text;
    v_employee_note text;
BEGIN
    -- Solo per nuove richieste (INSERT) con status pending
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
        -- Ottieni configurazione Supabase
        SELECT project_ref, service_role_key
        INTO v_supabase_url, v_service_role_key
        FROM app_config
        WHERE id = 1;

        IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
            -- Ottieni dati dipendente
            SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))
            INTO v_employee_name
            FROM profiles
            WHERE id = NEW.user_id;

            -- Determina tipo ferie/permesso
            v_leave_type := CASE
                WHEN NEW.type = 'vacation' THEN 'ferie'
                ELSE 'permesso'
            END;

            -- Formatta dettagli
            v_leave_details := CONCAT(
                'Dal: ', TO_CHAR(NEW.start_date, 'DD/MM/YYYY'),
                ' al: ', TO_CHAR(NEW.end_date, 'DD/MM/YYYY'),
                ' (', NEW.days, ' giorni)'
            );

            -- Note dipendente
            v_employee_note := COALESCE(NEW.reason, '');

            -- Costruisci URL completo
            IF NOT v_supabase_url LIKE 'http%' THEN
                v_supabase_url := 'https://' || v_supabase_url || '.supabase.co';
            END IF;

            -- Chiama Edge Function per inviare email (agli admin)
            BEGIN
                SELECT content INTO v_response
                FROM http((
                    'POST',
                    v_supabase_url || '/functions/v1/send-leave-request-email',
                    ARRAY[
                        http_header('Content-Type', 'application/json'),
                        http_header('Authorization', 'Bearer ' || v_service_role_key)
                    ],
                    'application/json',
                    json_build_object(
                        'recipientId', NULL,  -- NULL = invia a tutti gli admin
                        'employeeName', v_employee_name,
                        'leaveType', v_leave_type,
                        'leaveDetails', v_leave_details,
                        'employeeNote', v_employee_note,
                        'isApproval', false,
                        'isRejection', false
                    )::text
                ));

                RAISE NOTICE 'Email richiesta ferie inviata: %', v_response;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Errore invio email richiesta ferie: %', SQLERRM;
            END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. TRIGGER: Invio email approvazione/rifiuto ferie/permessi
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_leave_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_supabase_url text;
    v_service_role_key text;
    v_response text;
    v_employee_name text;
    v_leave_type text;
    v_leave_details text;
    v_admin_note text;
    v_is_approval boolean;
    v_is_rejection boolean;
BEGIN
    -- Solo se lo status cambia da pending ad approved/rejected
    IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
        -- Ottieni configurazione Supabase
        SELECT project_ref, service_role_key
        INTO v_supabase_url, v_service_role_key
        FROM app_config
        WHERE id = 1;

        IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
            -- Ottieni dati dipendente
            SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))
            INTO v_employee_name
            FROM profiles
            WHERE id = NEW.user_id;

            -- Determina tipo ferie/permesso
            v_leave_type := CASE
                WHEN NEW.type = 'vacation' THEN 'ferie'
                ELSE 'permesso'
            END;

            -- Formatta dettagli
            v_leave_details := CONCAT(
                'Dal: ', TO_CHAR(NEW.start_date, 'DD/MM/YYYY'),
                ' al: ', TO_CHAR(NEW.end_date, 'DD/MM/YYYY'),
                ' (', NEW.days, ' giorni)'
            );

            -- Note admin
            v_admin_note := COALESCE(NEW.admin_notes, '');

            -- Determina se è approvazione o rifiuto
            v_is_approval := (NEW.status = 'approved');
            v_is_rejection := (NEW.status = 'rejected');

            -- Costruisci URL completo
            IF NOT v_supabase_url LIKE 'http%' THEN
                v_supabase_url := 'https://' || v_supabase_url || '.supabase.co';
            END IF;

            -- Chiama Edge Function per inviare email (al dipendente)
            BEGIN
                SELECT content INTO v_response
                FROM http((
                    'POST',
                    v_supabase_url || '/functions/v1/send-leave-request-email',
                    ARRAY[
                        http_header('Content-Type', 'application/json'),
                        http_header('Authorization', 'Bearer ' || v_service_role_key)
                    ],
                    'application/json',
                    json_build_object(
                        'recipientId', NEW.user_id,  -- Invia al dipendente
                        'employeeName', v_employee_name,
                        'leaveType', v_leave_type,
                        'leaveDetails', v_leave_details,
                        'adminNote', v_admin_note,
                        'isApproval', v_is_approval,
                        'isRejection', v_is_rejection
                    )::text
                ));

                RAISE NOTICE 'Email cambio status ferie inviata: %', v_response;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Errore invio email cambio status ferie: %', SQLERRM;
            END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- VERIFICA
-- ============================================================================

SELECT '✅ Trigger email corretti con successo' as risultato;

SELECT
    'Funzioni trigger aggiornate:' as info,
    routine_name as funzione
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'notify_new_employee',
    'notify_leave_request',
    'notify_leave_status_change'
)
ORDER BY routine_name;
