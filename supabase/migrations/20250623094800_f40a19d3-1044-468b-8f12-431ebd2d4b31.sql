
-- Funzione per calcolare lo spazio occupato da un utente
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_size BIGINT := 0;
    document_size BIGINT := 0;
    document_count INTEGER := 0;
    result JSONB;
BEGIN
    -- Calcola dimensione totale dei documenti
    SELECT 
        COALESCE(SUM(file_size), 0),
        COUNT(*)
    INTO document_size, document_count
    FROM documents 
    WHERE user_id = user_uuid OR uploaded_by = user_uuid;
    
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

-- Funzione per eliminare tutti i dati di un utente (senza eliminare l'account)
CREATE OR REPLACE FUNCTION public.clear_user_data(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_documents INTEGER := 0;
    deleted_attendances INTEGER := 0;
    deleted_leave_requests INTEGER := 0;
    deleted_notifications INTEGER := 0;
    result JSONB;
BEGIN
    -- Elimina documenti
    DELETE FROM documents WHERE user_id = user_uuid OR uploaded_by = user_uuid;
    GET DIAGNOSTICS deleted_documents = ROW_COUNT;
    
    -- Elimina presenze
    DELETE FROM attendances WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_attendances = ROW_COUNT;
    
    DELETE FROM unified_attendances WHERE user_id = user_uuid;
    
    DELETE FROM manual_attendances WHERE user_id = user_uuid;
    
    -- Elimina richieste di ferie
    DELETE FROM leave_requests WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_leave_requests = ROW_COUNT;
    
    -- Elimina bilanci ferie
    DELETE FROM employee_leave_balance WHERE user_id = user_uuid;
    
    -- Elimina notifiche
    DELETE FROM notifications WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_notifications = ROW_COUNT;
    
    -- Elimina viaggi di lavoro
    DELETE FROM business_trips WHERE user_id = user_uuid;
    
    -- Costruisce il risultato
    result := jsonb_build_object(
        'success', true,
        'deleted_data', jsonb_build_object(
            'documents', deleted_documents,
            'attendances', deleted_attendances,
            'leave_requests', deleted_leave_requests,
            'notifications', deleted_notifications
        )
    );
    
    RETURN result;
END;
$$;

-- Funzione per eliminazione completa utente
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    clear_result JSONB;
BEGIN
    -- Prima elimina tutti i dati
    SELECT public.clear_user_data(user_uuid) INTO clear_result;
    
    -- Poi elimina il profilo
    DELETE FROM profiles WHERE id = user_uuid;
    
    -- Nota: L'utente in auth.users rimarrà ma senza profilo non potrà accedere
    
    result := jsonb_build_object(
        'success', true,
        'user_deleted', true,
        'data_cleared', clear_result
    );
    
    RETURN result;
END;
$$;

-- Aggiorna la funzione esistente per ottenere statistiche di tutti gli utenti
CREATE OR REPLACE FUNCTION public.get_all_users_storage_stats()
RETURNS TABLE (
    user_id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    storage_usage JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.email,
        public.get_user_storage_usage(p.id)
    FROM profiles p
    WHERE p.is_active = true
    ORDER BY p.first_name, p.last_name;
END;
$$;
