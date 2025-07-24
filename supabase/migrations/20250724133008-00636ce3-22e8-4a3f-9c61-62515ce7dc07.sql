-- Fix remaining function search path issues
-- Update all remaining functions to have secure search paths

-- Update is_employee_code_unique function
CREATE OR REPLACE FUNCTION public.is_employee_code_unique(code text, exclude_id uuid DEFAULT NULL::uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update get_user_storage_usage function
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(user_uuid uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update handle_leave_deletion function
CREATE OR REPLACE FUNCTION public.handle_leave_deletion()
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

-- Update get_all_users_storage_stats function
CREATE OR REPLACE FUNCTION public.get_all_users_storage_stats()
RETURNS TABLE(user_id uuid, first_name text, last_name text, email text, storage_usage jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update clear_user_data function
CREATE OR REPLACE FUNCTION public.clear_user_data(user_uuid uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Usa la funzione di pulizia completa
    RETURN public.complete_user_cleanup(user_uuid);
END;
$$;

-- Update verify_sick_leave_dates function
CREATE OR REPLACE FUNCTION public.verify_sick_leave_dates(p_user_id uuid, p_start_date date, p_end_date date)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update check_sick_leave_overlaps function
CREATE OR REPLACE FUNCTION public.check_sick_leave_overlaps(p_user_id uuid, p_start_date date, p_end_date date, p_exclude_id uuid DEFAULT NULL::uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update generate_sick_leave_reference_code function
CREATE OR REPLACE FUNCTION public.generate_sick_leave_reference_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update auto_generate_sick_leave_reference function
CREATE OR REPLACE FUNCTION public.auto_generate_sick_leave_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only generate if reference_code is not already set
    IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
        NEW.reference_code := public.generate_sick_leave_reference_code();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update verify_user_data_exists function
CREATE OR REPLACE FUNCTION public.verify_user_data_exists(user_uuid uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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