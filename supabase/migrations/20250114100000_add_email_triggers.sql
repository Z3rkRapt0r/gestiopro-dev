-- ============================================================================
-- EMAIL TRIGGERS - Configurazione trigger automatici per invio email
-- ============================================================================

-- ============================================================================
-- 1. TRIGGER: Invio email creazione account (nuovo dipendente)
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

            -- Chiama Edge Function per inviare email
            BEGIN
                SELECT content INTO v_response
                FROM http((
                    'POST',
                    v_supabase_url || '/functions/v1/create-employee',
                    ARRAY[
                        http_header('Content-Type', 'application/json'),
                        http_header('Authorization', 'Bearer ' || v_service_role_key)
                    ],
                    'application/json',
                    json_build_object(
                        'employeeId', NEW.id,
                        'email', NEW.email,
                        'firstName', NEW.first_name,
                        'lastName', NEW.last_name
                    )::text
                ));

                RAISE NOTICE 'Email nuovo dipendente inviata: %', v_response;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Errore invio email nuovo dipendente: %', SQLERRM;
            END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger se esiste
DROP TRIGGER IF EXISTS trigger_notify_new_employee ON profiles;

-- Crea trigger
CREATE TRIGGER trigger_notify_new_employee
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_employee();

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
BEGIN
    -- Solo per nuove richieste (INSERT) con status pending
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
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

            -- Chiama Edge Function per inviare email
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
                        'leaveRequestId', NEW.id,
                        'userId', NEW.user_id,
                        'type', NEW.type,
                        'status', 'pending'
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

-- Drop trigger se esiste
DROP TRIGGER IF EXISTS trigger_notify_leave_request ON leave_requests;

-- Crea trigger
CREATE TRIGGER trigger_notify_leave_request
    AFTER INSERT ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_leave_request();

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
BEGIN
    -- Solo se lo status cambia da pending ad approved/rejected
    IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
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

            -- Chiama Edge Function per inviare email
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
                        'leaveRequestId', NEW.id,
                        'userId', NEW.user_id,
                        'type', NEW.type,
                        'status', NEW.status
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

-- Drop trigger se esiste
DROP TRIGGER IF EXISTS trigger_notify_leave_status_change ON leave_requests;

-- Crea trigger
CREATE TRIGGER trigger_notify_leave_status_change
    AFTER UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_leave_status_change();

-- ============================================================================
-- VERIFICA
-- ============================================================================

SELECT '✅ Trigger email configurati con successo' as risultato;

SELECT
    'Trigger creati:' as info,
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
    'trigger_notify_new_employee',
    'trigger_notify_leave_request',
    'trigger_notify_leave_status_change'
)
ORDER BY event_object_table, trigger_name;
