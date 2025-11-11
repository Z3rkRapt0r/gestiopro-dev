-- ============================================================================
-- SCRIPT COMPLETO PER SISTEMARE E APPLICARE TUTTE LE MIGRATIONS
-- ============================================================================
-- Esegui questo script nel SQL Editor del database clone (lqonbxuexleupovsdtsj)
-- ============================================================================

-- STEP 1: Aggiorna constraint template_type per includere 'employee-message'
ALTER TABLE IF EXISTS email_templates
DROP CONSTRAINT IF EXISTS check_template_type;

ALTER TABLE IF EXISTS email_templates
ADD CONSTRAINT check_template_type
CHECK (template_type IN (
  'documenti',
  'notifiche',
  'approvazioni',
  'generale',
  'permessi-richiesta',
  'permessi-approvazione',
  'permessi-rifiuto',
  'ferie-richiesta',
  'ferie-approvazione',
  'ferie-rifiuto',
  'avviso-entrata',
  'employee-message'  -- ✅ AGGIUNTO
));

-- STEP 2: Assicurati che app_config abbia la colonna service_role_key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'app_config'
        AND column_name = 'service_role_key'
    ) THEN
        ALTER TABLE app_config ADD COLUMN service_role_key TEXT;
        RAISE NOTICE '✅ Colonna service_role_key aggiunta a app_config';
    ELSE
        RAISE NOTICE 'ℹ️  Colonna service_role_key già presente';
    END IF;
END $$;

-- STEP 3: Assicurati che esista un record in app_config
-- Usa valori temporanei (verranno sovrascritti via UI admin)
-- IMPORTANTE: Dopo questa migrazione, configura i valori reali tramite UI Admin
INSERT INTO app_config (id, project_ref, anon_key, service_role_key)
VALUES (1, 'https://lqonbxuexleupovsdtsj.supabase.co', 'TEMPORARY_KEY_REPLACE_VIA_ADMIN_UI', NULL)
ON CONFLICT (id) DO NOTHING;

-- STEP 4: Verifica e abilita estensioni necessarie
CREATE EXTENSION IF NOT EXISTS http SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- VERIFICA STATO
-- ============================================================================

SELECT '============================================' as separator;
SELECT '📊 VERIFICA CONFIGURAZIONE DATABASE' as titolo;
SELECT '============================================' as separator;

-- 1. Verifica constraint template_type
SELECT
    '1️⃣ Constraint template_type' as check_name,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'check_template_type'
            AND conrelid = 'email_templates'::regclass
        ) THEN '✅ Presente e aggiornato'
        ELSE '❌ Mancante'
    END as stato;

-- 2. Verifica colonne app_config
SELECT
    '2️⃣ Colonne app_config' as check_name,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as colonne
FROM information_schema.columns
WHERE table_name = 'app_config'
AND table_schema = 'public';

-- 3. Verifica record app_config
SELECT
    '3️⃣ Record app_config' as check_name,
    CASE
        WHEN project_ref IS NOT NULL THEN '✅ project_ref configurato'
        ELSE '⚠️ project_ref vuoto (da configurare via UI)'
    END as project_ref_status,
    CASE
        WHEN anon_key IS NOT NULL THEN '✅ anon_key configurato'
        ELSE '⚠️ anon_key vuoto (da configurare via UI)'
    END as anon_key_status,
    CASE
        WHEN service_role_key IS NOT NULL THEN '✅ service_role_key configurato'
        ELSE '⚠️ service_role_key vuoto (da configurare via UI)'
    END as service_key_status
FROM app_config
WHERE id = 1;

-- 4. Verifica estensioni
SELECT
    '4️⃣ Estensioni' as check_name,
    string_agg(extname, ', ') as estensioni_attive
FROM pg_extension
WHERE extname IN ('http', 'pg_cron');

-- 5. Verifica funzione attendance_monitor_cron
SELECT
    '5️⃣ Funzione attendance_monitor_cron' as check_name,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ Presente'
        ELSE '⚠️ Mancante (verrà creata dalle migrations)'
    END as stato
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'attendance_monitor_cron';

-- 6. Verifica cron jobs
SELECT
    '6️⃣ Cron Jobs attendance' as check_name,
    COALESCE(string_agg(jobname || ' (' || schedule || ')', ', '), '⚠️ Nessun cron job (verrà creato dalle migrations)') as jobs
FROM cron.job
WHERE jobname LIKE '%attendance%';

SELECT '============================================' as separator;
SELECT '✅ VERIFICA COMPLETATA' as risultato;
SELECT '============================================' as separator;
SELECT 'Ora puoi eseguire: npx supabase db push --include-all' as prossimo_step;
