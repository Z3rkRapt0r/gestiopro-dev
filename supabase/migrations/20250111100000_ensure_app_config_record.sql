-- ============================================================================
-- ASSICURA ESISTENZA RECORD app_config
-- ============================================================================
-- Questa migrazione garantisce che esista sempre un record in app_config
-- con id=1, necessario per il funzionamento del sistema di monitoraggio presenze
-- ============================================================================

-- Inserisci il record solo se non esiste già
INSERT INTO public.app_config (id, project_ref, anon_key, service_role_key)
SELECT
    1,
    '',  -- Da configurare dall'admin
    '',  -- Da configurare dall'admin
    NULL -- Da configurare dall'admin
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_config WHERE id = 1
);

-- Aggiungi commenti per documentazione
COMMENT ON TABLE public.app_config IS
'Configurazione globale dell''applicazione.
Contiene URL progetto Supabase, chiavi API e altre configurazioni centrali.
Configurabile dall''interfaccia admin in: Impostazioni → Presenze & Monitoraggio → Configurazione Supabase';

COMMENT ON COLUMN public.app_config.project_ref IS
'URL completo del progetto Supabase (es: https://xxx.supabase.co).
IMPORTANTE: Deve essere configurato quando si clona il progetto.';

COMMENT ON COLUMN public.app_config.anon_key IS
'Chiave pubblica (anon key) per chiamate client-side.
Visibile nel codice client, sicura per uso pubblico.';

COMMENT ON COLUMN public.app_config.service_role_key IS
'Service Role Key per chiamate server-side (bypass RLS).
SENSIBILE: Usata solo da funzioni server-side come pg_cron.
Deve essere configurata dall''admin per il funzionamento del monitoraggio presenze.';

-- Verifica che il record esista
SELECT
    'app_config' as tabella,
    COUNT(*) as record_totali,
    CASE
        WHEN COUNT(*) = 1 THEN '✅ Record esistente'
        WHEN COUNT(*) = 0 THEN '❌ Record mancante (verrà creato)'
        ELSE '⚠️ Record multipli (potenziale problema)'
    END as stato
FROM public.app_config
WHERE id = 1;
