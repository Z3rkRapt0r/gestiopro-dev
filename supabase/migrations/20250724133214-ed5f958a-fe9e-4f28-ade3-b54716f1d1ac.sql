-- Fix the remaining function search path issues

-- Update complete_user_cleanup function
CREATE OR REPLACE FUNCTION public.complete_user_cleanup(user_uuid uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update delete_user_completely function
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_uuid uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update get_upcoming_leaves function
CREATE OR REPLACE FUNCTION public.get_upcoming_leaves(days_ahead integer DEFAULT 10)
RETURNS TABLE(id uuid, user_id uuid, type text, start_date date, end_date date, first_name text, last_name text, email text, note text, days_until integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update populate_working_days_for_user function
CREATE OR REPLACE FUNCTION public.populate_working_days_for_user(target_user_id uuid, start_date date DEFAULT NULL::date, end_date date DEFAULT (CURRENT_DATE + '1 year'::interval))
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update should_track_employee_on_date function
CREATE OR REPLACE FUNCTION public.should_track_employee_on_date(target_user_id uuid, check_date date)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update calculate_leave_usage function
CREATE OR REPLACE FUNCTION public.calculate_leave_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    work_schedule RECORD;
    working_days_count INTEGER := 0;
    loop_date DATE;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    -- Se la richiesta è approvata, aggiorna il bilancio
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Per le ferie (calcola giorni lavorativi basandosi sulla configurazione)
        IF NEW.type = 'ferie' AND NEW.date_from IS NOT NULL AND NEW.date_to IS NOT NULL THEN
            -- Calcola i giorni lavorativi basandosi sulla configurazione work_schedules
            loop_date := NEW.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= NEW.date_to LOOP
                -- Controlla se il giorno è lavorativo secondo la configurazione
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
            
            UPDATE public.employee_leave_balance 
            SET vacation_days_used = vacation_days_used + working_days_count,
                updated_at = now()
            WHERE user_id = NEW.user_id 
            AND year = EXTRACT(year FROM NEW.date_from);
        END IF;
        
        -- Per i permessi orari ONLY (removed daily permission logic)
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
            -- Ricalcola i giorni lavorativi per la sottrazione
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
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update recalculate_all_leave_balances function
CREATE OR REPLACE FUNCTION public.recalculate_all_leave_balances()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    request_record RECORD;
    work_schedule RECORD;
    working_days_count INTEGER;
    loop_date DATE;
BEGIN
    -- Get work schedule
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    -- Reset all used values to 0 WHERE they exist (this satisfies the WHERE clause requirement)
    UPDATE public.employee_leave_balance SET 
        vacation_days_used = 0,
        permission_hours_used = 0,
        updated_at = now()
    WHERE id IS NOT NULL;
    
    -- Recalculate for each approved request
    FOR request_record IN 
        SELECT * FROM public.leave_requests WHERE status = 'approved'
    LOOP
        IF request_record.type = 'ferie' AND request_record.date_from IS NOT NULL AND request_record.date_to IS NOT NULL THEN
            -- Calculate working days for vacation
            loop_date := request_record.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= request_record.date_to LOOP
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
            SET vacation_days_used = vacation_days_used + working_days_count,
                updated_at = now()
            WHERE user_id = request_record.user_id 
            AND year = EXTRACT(year FROM request_record.date_from);
            
        -- Per i permessi orari ONLY (removed daily permission logic)
        ELSIF request_record.type = 'permesso' AND request_record.time_from IS NOT NULL AND request_record.time_to IS NOT NULL THEN
            -- Hourly permission
            UPDATE public.employee_leave_balance 
            SET permission_hours_used = permission_hours_used + EXTRACT(EPOCH FROM (request_record.time_to - request_record.time_from))/3600,
                updated_at = now()
            WHERE user_id = request_record.user_id 
            AND year = EXTRACT(year FROM request_record.day);
        END IF;
    END LOOP;
    
    RETURN 'Recalculation completed successfully - daily permissions removed';
END;
$$;