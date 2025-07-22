
-- Corregge la funzione per calcolare lo spazio occupato da un utente
-- Ora conta solo i documenti di cui l'utente è proprietario (user_id)
-- eliminando il doppio conteggio causato dal controllo su uploaded_by
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
    -- Calcola dimensione totale dei documenti solo per user_id (proprietario)
    SELECT 
        COALESCE(SUM(file_size), 0),
        COUNT(*)
    INTO document_size, document_count
    FROM documents 
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
