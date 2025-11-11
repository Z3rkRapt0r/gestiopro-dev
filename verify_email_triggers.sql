-- ============================================================================
-- VERIFICA TRIGGER EMAIL INSTALLATI
-- ============================================================================
-- Questo script verifica che tutti i trigger email siano stati installati correttamente
-- ============================================================================

-- 1. Verifica esistenza trigger
SELECT
    '🔍 TRIGGER INSTALLATI:' as info,
    trigger_name,
    event_manipulation as evento,
    event_object_table as tabella,
    action_timing as quando
FROM information_schema.triggers
WHERE trigger_name IN (
    'trigger_notify_new_employee',
    'trigger_notify_leave_request',
    'trigger_notify_leave_status_change'
)
ORDER BY event_object_table, trigger_name;

-- 2. Verifica funzioni trigger esistono
SELECT
    '🔍 FUNZIONI TRIGGER:' as info,
    routine_name as funzione,
    routine_type as tipo
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'notify_new_employee',
    'notify_leave_request',
    'notify_leave_status_change'
)
ORDER BY routine_name;

-- 3. Verifica configurazione app_config (necessaria per i trigger)
SELECT
    '🔍 CONFIGURAZIONE SUPABASE:' as info,
    id,
    project_ref,
    CASE
        WHEN service_role_key IS NOT NULL THEN '✅ Configurata'
        ELSE '❌ Mancante'
    END as service_role_key_status
FROM app_config
WHERE id = 1;

-- 4. Verifica estensione http (necessaria per chiamare Edge Functions)
SELECT
    '🔍 ESTENSIONE HTTP:' as info,
    extname as estensione,
    extversion as versione
FROM pg_extension
WHERE extname = 'http';

-- 5. Conteggio email templates disponibili
SELECT
    '🔍 EMAIL TEMPLATES:' as info,
    COUNT(*) as totale_template,
    COUNT(CASE WHEN template_type LIKE '%ferie%' THEN 1 END) as template_ferie,
    COUNT(CASE WHEN template_type LIKE '%permessi%' THEN 1 END) as template_permessi
FROM email_templates;

-- ============================================================================
-- RISULTATO ATTESO
-- ============================================================================
--
-- ✅ 3 trigger installati (trigger_notify_new_employee, trigger_notify_leave_request, trigger_notify_leave_status_change)
-- ✅ 3 funzioni create (notify_new_employee, notify_leave_request, notify_leave_status_change)
-- ✅ Configurazione Supabase presente in app_config
-- ✅ Estensione http installata
-- ✅ Email templates presenti
--
