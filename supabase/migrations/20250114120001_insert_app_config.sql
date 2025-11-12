-- ============================================================================
-- INSERT APP_CONFIG - Inserisce configurazione per trigger email
-- ============================================================================

-- Inserisci o aggiorna configurazione
INSERT INTO app_config (id, project_ref, service_role_key)
VALUES (1, 'nohufgceuqhkycsdffqj', NULL)
ON CONFLICT (id)
DO UPDATE SET project_ref = 'nohufgceuqhkycsdffqj';

-- Mostra stato attuale
SELECT
    'Stato app_config:' as info,
    id,
    project_ref,
    CASE
        WHEN service_role_key IS NOT NULL THEN '✅ Configurata'
        ELSE '❌ MANCA service_role_key - Devi aggiornarla manualmente!'
    END as service_role_key_status
FROM app_config
WHERE id = 1;

-- Istruzioni per completare setup
DO $$
BEGIN
    RAISE NOTICE '=== ISTRUZIONI SETUP ===';
    RAISE NOTICE 'Per completare la configurazione dei trigger email:';
    RAISE NOTICE '1. Vai su Supabase Dashboard';
    RAISE NOTICE '2. Settings > API > Project API keys';
    RAISE NOTICE '3. Copia la "service_role" key (secret)';
    RAISE NOTICE '4. Esegui: UPDATE app_config SET service_role_key = ''TUA_KEY'' WHERE id = 1;';
    RAISE NOTICE '========================';
END $$;
