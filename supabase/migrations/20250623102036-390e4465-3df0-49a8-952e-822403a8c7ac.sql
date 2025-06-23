
-- Funzione per verificare se esistono ancora dati associati a un utente
CREATE OR REPLACE FUNCTION public.verify_user_data_exists(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
    FROM documents 
    WHERE user_id = user_uuid OR uploaded_by = user_uuid;
    
    -- Verifica presenze
    SELECT COUNT(*) INTO attendances_count
    FROM attendances 
    WHERE user_id = user_uuid;
    
    -- Verifica presenze unificate
    SELECT COUNT(*) INTO unified_attendances_count
    FROM unified_attendances 
    WHERE user_id = user_uuid;
    
    -- Verifica presenze manuali
    SELECT COUNT(*) INTO manual_attendances_count
    FROM manual_attendances 
    WHERE user_id = user_uuid;
    
    -- Verifica richieste di ferie
    SELECT COUNT(*) INTO leave_requests_count
    FROM leave_requests 
    WHERE user_id = user_uuid;
    
    -- Verifica bilanci ferie
    SELECT COUNT(*) INTO leave_balance_count
    FROM employee_leave_balance 
    WHERE user_id = user_uuid;
    
    -- Verifica notifiche
    SELECT COUNT(*) INTO notifications_count
    FROM notifications 
    WHERE user_id = user_uuid;
    
    -- Verifica viaggi di lavoro
    SELECT COUNT(*) INTO business_trips_count
    FROM business_trips 
    WHERE user_id = user_uuid;
    
    -- Verifica notifiche inviate
    SELECT COUNT(*) INTO sent_notifications_count
    FROM sent_notifications 
    WHERE recipient_id = user_uuid;
    
    -- Verifica messaggi
    SELECT COUNT(*) INTO messages_count
    FROM messages 
    WHERE recipient_id = user_uuid OR sender_id = user_uuid;
    
    -- Verifica se esiste ancora il profilo
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_uuid) INTO profile_exists;
    
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

-- Funzione per la rimozione completa e definitiva di tutti i dati utente
CREATE OR REPLACE FUNCTION public.complete_user_cleanup(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
    DELETE FROM documents WHERE user_id = user_uuid OR uploaded_by = user_uuid;
    GET DIAGNOSTICS deleted_documents = ROW_COUNT;
    RAISE NOTICE 'Eliminati % documenti', deleted_documents;
    
    -- Elimina presenze
    DELETE FROM attendances WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_attendances = ROW_COUNT;
    RAISE NOTICE 'Eliminate % presenze', deleted_attendances;
    
    -- Elimina presenze unificate
    DELETE FROM unified_attendances WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_unified_attendances = ROW_COUNT;
    RAISE NOTICE 'Eliminate % presenze unificate', deleted_unified_attendances;
    
    -- Elimina presenze manuali
    DELETE FROM manual_attendances WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_manual_attendances = ROW_COUNT;
    RAISE NOTICE 'Eliminate % presenze manuali', deleted_manual_attendances;
    
    -- Elimina richieste di ferie
    DELETE FROM leave_requests WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_leave_requests = ROW_COUNT;
    RAISE NOTICE 'Eliminate % richieste di ferie', deleted_leave_requests;
    
    -- Elimina bilanci ferie
    DELETE FROM employee_leave_balance WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_leave_balance = ROW_COUNT;
    RAISE NOTICE 'Eliminati % bilanci ferie', deleted_leave_balance;
    
    -- Elimina notifiche
    DELETE FROM notifications WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_notifications = ROW_COUNT;
    RAISE NOTICE 'Eliminate % notifiche', deleted_notifications;
    
    -- Elimina viaggi di lavoro
    DELETE FROM business_trips WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_business_trips = ROW_COUNT;
    RAISE NOTICE 'Eliminati % viaggi di lavoro', deleted_business_trips;
    
    -- Elimina notifiche inviate
    DELETE FROM sent_notifications WHERE recipient_id = user_uuid;
    GET DIAGNOSTICS deleted_sent_notifications = ROW_COUNT;
    RAISE NOTICE 'Eliminate % notifiche inviate', deleted_sent_notifications;
    
    -- Elimina messaggi (sia come mittente che come destinatario)
    DELETE FROM messages WHERE recipient_id = user_uuid OR sender_id = user_uuid;
    GET DIAGNOSTICS deleted_messages = ROW_COUNT;
    RAISE NOTICE 'Eliminati % messaggi', deleted_messages;
    
    -- Elimina il profilo (se esiste ancora)
    DELETE FROM profiles WHERE id = user_uuid;
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

-- Aggiorna la funzione esistente clear_user_data per usare la nuova funzione di pulizia completa
CREATE OR REPLACE FUNCTION public.clear_user_data(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Usa la funzione di pulizia completa
    RETURN public.complete_user_cleanup(user_uuid);
END;
$$;

-- Aggiorna la funzione delete_user_completely per garantire la pulizia completa
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
