-- ============================================================================
-- SETUP APP_CONFIG - Configurazione necessaria per i trigger email
-- ============================================================================
-- Questa tabella contiene le credenziali per chiamare le Edge Functions
-- ============================================================================

-- Crea tabella se non esiste
CREATE TABLE IF NOT EXISTS app_config (
    id INTEGER PRIMARY KEY,
    project_ref TEXT NOT NULL,
    service_role_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserisci configurazione se non esiste
-- NOTA: Usa il project_ref del tuo progetto Supabase
INSERT INTO app_config (id, project_ref, service_role_key)
VALUES (
    1,
    'nohufgceuqhkycsdffqj',  -- Il tuo project ref
    current_setting('app.settings.service_role_key', true)  -- Legge da env se disponibile
)
ON CONFLICT (id) DO UPDATE
SET
    project_ref = EXCLUDED.project_ref,
    updated_at = NOW();

-- Se service_role_key è NULL, mostra avviso
DO $$
DECLARE
    v_key text;
BEGIN
    SELECT service_role_key INTO v_key FROM app_config WHERE id = 1;

    IF v_key IS NULL OR v_key = '' THEN
        RAISE WARNING '⚠️ service_role_key non configurata!';
        RAISE WARNING 'Per far funzionare i trigger email, esegui:';
        RAISE WARNING 'UPDATE app_config SET service_role_key = ''TUA_SERVICE_ROLE_KEY'' WHERE id = 1;';
    ELSE
        RAISE NOTICE '✅ app_config configurata correttamente';
    END IF;
END $$;

-- Mostra configurazione
SELECT
    '✅ Configurazione app_config:' as info,
    id,
    project_ref,
    CASE
        WHEN service_role_key IS NOT NULL AND service_role_key != ''
        THEN '✅ Configurata (' || LENGTH(service_role_key) || ' caratteri)'
        ELSE '❌ MANCANTE - Aggiorna manualmente!'
    END as service_role_key_status
FROM app_config
WHERE id = 1;
