-- Fix complete_user_cleanup() - Rimuove riferimento alla tabella manual_attendances che non esiste
-- Errore: relation "public.manual_attendances" does not exist

CREATE OR REPLACE FUNCTION public.complete_user_cleanup(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    deleted_documents INTEGER := 0;
    deleted_attendances INTEGER := 0;
    deleted_unified_attendances INTEGER := 0;
    deleted_leave_requests INTEGER := 0;
    deleted_leave_balance INTEGER := 0;
    deleted_notifications INTEGER := 0;
    deleted_business_trips INTEGER := 0;
    deleted_sent_notifications INTEGER := 0;
    deleted_sick_leaves INTEGER := 0;
    deleted_overtime_records INTEGER := 0;
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
    
    -- RIMOSSO: manual_attendances (tabella non esistente)
    
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
    
    -- RIMOSSO: messages (tabella non esistente - è stata rimossa dal sistema)
    -- I messaggi sono ora gestiti tramite notifications
    
    -- Elimina malattie
    DELETE FROM public.sick_leaves WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_sick_leaves = ROW_COUNT;
    RAISE NOTICE 'Eliminate % malattie', deleted_sick_leaves;
    
    -- Elimina straordinari
    DELETE FROM public.overtime_records WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_overtime_records = ROW_COUNT;
    RAISE NOTICE 'Eliminati % straordinari', deleted_overtime_records;
    
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
            'leave_requests', deleted_leave_requests,
            'leave_balance', deleted_leave_balance,
            'notifications', deleted_notifications,
            'business_trips', deleted_business_trips,
            'sent_notifications', deleted_sent_notifications,
            'sick_leaves', deleted_sick_leaves,
            'overtime_records', deleted_overtime_records,
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

-- Aggiorna anche verify_user_data_exists per rimuovere manual_attendances
CREATE OR REPLACE FUNCTION public.verify_user_data_exists(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    result JSONB;
    documents_count INTEGER := 0;
    attendances_count INTEGER := 0;
    unified_attendances_count INTEGER := 0;
    leave_requests_count INTEGER := 0;
    leave_balance_count INTEGER := 0;
    notifications_count INTEGER := 0;
    business_trips_count INTEGER := 0;
    sent_notifications_count INTEGER := 0;
    sick_leaves_count INTEGER := 0;
    overtime_records_count INTEGER := 0;
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
    
    -- RIMOSSO: manual_attendances
    
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
    
    -- RIMOSSO: messages (tabella non esistente)
    
    -- Verifica malattie
    SELECT COUNT(*) INTO sick_leaves_count
    FROM public.sick_leaves 
    WHERE user_id = user_uuid;
    
    -- Verifica straordinari
    SELECT COUNT(*) INTO overtime_records_count
    FROM public.overtime_records 
    WHERE user_id = user_uuid;
    
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
            'leave_requests', leave_requests_count,
            'leave_balance', leave_balance_count,
            'notifications', notifications_count,
            'business_trips', business_trips_count,
            'sent_notifications', sent_notifications_count,
            'sick_leaves', sick_leaves_count,
            'overtime_records', overtime_records_count
        ),
        'has_remaining_data', (
            documents_count > 0 OR 
            attendances_count > 0 OR 
            unified_attendances_count > 0 OR 
            leave_requests_count > 0 OR 
            leave_balance_count > 0 OR 
            notifications_count > 0 OR 
            business_trips_count > 0 OR 
            sent_notifications_count > 0 OR 
            sick_leaves_count > 0 OR 
            overtime_records_count > 0 OR 
            profile_exists
        )
    );
    
    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.complete_user_cleanup(UUID) IS 
'Elimina completamente tutti i dati di un utente dal sistema (senza manual_attendances e messages)';

COMMENT ON FUNCTION public.verify_user_data_exists(UUID) IS 
'Verifica l''esistenza di dati residui per un utente (senza manual_attendances e messages)';
