-- Setup app_config se non esiste o se mancano dati
-- Questa tabella è necessaria per i trigger email

-- Crea tabella se non esiste
CREATE TABLE IF NOT EXISTS app_config (
    id INTEGER PRIMARY KEY,
    project_ref TEXT,
    service_role_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verifica se esiste già un record
DO $$
BEGIN
    -- Se non esiste record con id=1, informalo (non possiamo inserire senza i valori)
    IF NOT EXISTS (SELECT 1 FROM app_config WHERE id = 1) THEN
        RAISE NOTICE 'ATTENZIONE: Tabella app_config esiste ma è vuota!';
        RAISE NOTICE 'Devi inserire manualmente:';
        RAISE NOTICE '  project_ref: il tuo project ref Supabase (es: nohufgceuqhkycsdffqj)';
        RAISE NOTICE '  service_role_key: la tua service role key';
        RAISE NOTICE 'Comando: INSERT INTO app_config (id, project_ref, service_role_key) VALUES (1, ''TUO_PROJECT_REF'', ''TUA_SERVICE_ROLE_KEY'');';
    ELSE
        RAISE NOTICE '✅ Record app_config trovato con id=1';
    END IF;
END $$;

-- Mostra configurazione attuale
SELECT
    'Configurazione attuale:' as info,
    id,
    project_ref,
    CASE
        WHEN service_role_key IS NOT NULL AND service_role_key != '' THEN '✅ Configurata'
        ELSE '❌ Mancante'
    END as service_role_key_status
FROM app_config
WHERE id = 1;
