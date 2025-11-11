-- ============================================================================
-- CONFIGURAZIONE VARIABILI D'AMBIENTE PER ATTENDANCE MONITOR
-- ============================================================================
-- Esegui questo script UNA VOLTA per configurare le variabili d'ambiente
-- che verranno usate dalla funzione attendance_monitor_cron()
-- ============================================================================

-- IMPORTANTE: Sostituisci i valori con quelli del TUO progetto Supabase!

-- Imposta l'URL del progetto Supabase
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://nohufgceuqhkycsdffqj.supabase.co';

-- Imposta la Service Role Key
-- ATTENZIONE: Questa è una chiave sensibile! Non committarla nel repository.
-- Trova la tua Service Role Key in: Supabase Dashboard → Project Settings → API → service_role key
ALTER DATABASE postgres 
SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg5MTI3NiwiZXhwIjoyMDY1NDY3Mjc2fQ.TUO-SERVICE-ROLE-KEY-QUI';

-- Ricarica la configurazione per applicare le modifiche
SELECT pg_reload_conf();

-- ============================================================================
-- VERIFICA CONFIGURAZIONE
-- ============================================================================

-- Verifica che le variabili siano state impostate correttamente
SELECT 
    'app.settings.supabase_url' as setting_name,
    current_setting('app.settings.supabase_url', true) as setting_value
UNION ALL
SELECT 
    'app.settings.service_role_key' as setting_name,
    CASE 
        WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL 
        THEN '✅ Configurata (nascosta per sicurezza)'
        ELSE '❌ NON configurata'
    END as setting_value;

-- ============================================================================
-- ISTRUZIONI
-- ============================================================================

/*
DOPO AVER ESEGUITO QUESTO SCRIPT:

1. ✅ Le variabili sono configurate nel database
2. ✅ La funzione attendance_monitor_cron() le userà automaticamente
3. ✅ Il cron job esistente continuerà a funzionare normalmente

QUANDO CLONI IL PROGETTO:
- Copia questo file nel nuovo progetto
- Sostituisci i valori con quelli del nuovo progetto Supabase
- Esegui di nuovo questo script
- FATTO! Nessun altro file da modificare.

NOTA: Per maggiore sicurezza, puoi anche usare Supabase Vault:
1. Vai su: Supabase Dashboard → Project Settings → Vault
2. Crea i secrets: supabase_url e service_role_key
3. Poi usa: ALTER DATABASE postgres SET app.settings.supabase_url = 'vault://supabase_url';
*/


