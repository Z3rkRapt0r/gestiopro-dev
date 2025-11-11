-- ============================================================================
-- SCRIPT COMPLETO PER APPLICARE TUTTE LE MODIFICHE AL DATABASE CLONE
-- ============================================================================
-- Esegui questo script nel SQL Editor del nuovo progetto Supabase
-- ============================================================================

-- STEP 1: Rimuovi temporaneamente constraint problematici
ALTER TABLE IF EXISTS email_templates DROP CONSTRAINT IF EXISTS check_template_type;

-- STEP 2: Aggiungi colonna service_role_key a app_config (se non esiste)
ALTER TABLE IF EXISTS app_config
ADD COLUMN IF NOT EXISTS service_role_key TEXT;

-- STEP 3: Assicurati che il record app_config esista
INSERT INTO app_config (id, project_ref, anon_key, service_role_key)
VALUES (1, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- STEP 4: Verifica estensioni necessarie
CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- VERIFICA STATO ATTUALE
-- ============================================================================

-- Mostra tabelle esistenti
SELECT
    'Tabelle nel database' as info,
    COUNT(*) as conteggio
FROM information_schema.tables
WHERE table_schema = 'public';

-- Mostra colonne di app_config
SELECT
    'Colonne in app_config' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'app_config'
ORDER BY ordinal_position;

-- Mostra record app_config
SELECT
    'Record app_config' as info,
    id,
    project_ref,
    CASE WHEN anon_key IS NOT NULL THEN '✅ Presente' ELSE '❌ Vuoto' END as anon_key_status,
    CASE WHEN service_role_key IS NOT NULL THEN '✅ Presente' ELSE '❌ Vuoto' END as service_key_status
FROM app_config
WHERE id = 1;

-- Verifica cron jobs
SELECT
    'Cron Jobs' as info,
    jobname,
    schedule,
    active
FROM cron.job
WHERE jobname LIKE '%attendance%';

-- Verifica funzioni attendance_monitor
SELECT
    'Funzione attendance_monitor_cron' as info,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ Presente'
        ELSE '❌ Mancante'
    END as stato
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'attendance_monitor_cron';
