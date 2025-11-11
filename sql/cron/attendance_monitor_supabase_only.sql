-- ============================================================================
-- SISTEMA DI MONITORAGGIO PRESENZE - 100% SUPABASE
-- ============================================================================
-- Versione semplificata che usa solo Supabase (pg_cron + Edge Functions)
-- ZERO HARDCODE: tutto viene dalle variabili d'ambiente Supabase
-- ============================================================================

-- ============================================================================
-- STEP 1: Creare la funzione che chiama l'Edge Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_attendance_check_via_edge_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_response TEXT;
BEGIN
  -- Leggi le variabili d'ambiente da Supabase Vault
  -- Queste vengono impostate nel dashboard Supabase → Project Settings → Vault
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- Se le variabili non sono impostate, esci silenziosamente
  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE NOTICE 'Supabase URL or Service Role Key not configured in Vault';
    RETURN;
  END IF;

  -- Chiama l'Edge Function usando http extension
  SELECT content::text INTO v_response
  FROM http((
    'POST',
    v_supabase_url || '/functions/v1/check-missing-attendance',
    ARRAY[
      http_header('Authorization', 'Bearer ' || v_service_role_key),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    '{}'
  )::http_request);

  RAISE NOTICE 'Edge Function called successfully: %', v_response;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error calling Edge Function: %', SQLERRM;
END;
$$;

-- ============================================================================
-- STEP 2: Schedulare la funzione con pg_cron
-- ============================================================================

-- Rimuovi il job esistente se presente
SELECT cron.unschedule('check-missing-attendance-job');

-- Crea il nuovo job che gira ogni 15 minuti, dalle 8 alle 18, lun-ven
SELECT cron.schedule(
  'check-missing-attendance-job',          -- Nome del job
  '*/15 8-18 * * 1-5',                     -- Ogni 15 min, 8-18, lun-ven
  $$SELECT public.trigger_attendance_check_via_edge_function();$$
);

-- ============================================================================
-- STEP 3: Verificare il setup
-- ============================================================================

-- Vedi tutti i cron jobs attivi
SELECT * FROM cron.job;

-- Vedi lo storico delle esecuzioni
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-missing-attendance-job')
ORDER BY start_time DESC 
LIMIT 10;

-- ============================================================================
-- STEP 4: Test manuale (opzionale)
-- ============================================================================

-- Testa la funzione manualmente
-- SELECT public.trigger_attendance_check_via_edge_function();

-- ============================================================================
-- CONFIGURAZIONE SUPABASE VAULT (da fare nel Dashboard)
-- ============================================================================

/*
Per impostare le variabili d'ambiente in Supabase:

1. Vai su: Supabase Dashboard → Project Settings → Vault
2. Aggiungi questi secrets:
   - Nome: supabase_url
     Valore: https://tuo-progetto.supabase.co
   
   - Nome: service_role_key
     Valore: eyJ... (la tua service role key)

3. Poi esegui questi comandi SQL per renderli disponibili:

ALTER DATABASE postgres SET app.settings.supabase_url = 'vault://supabase_url';
ALTER DATABASE postgres SET app.settings.service_role_key = 'vault://service_role_key';

NOTA: In alternativa, puoi usare direttamente current_setting() con i valori
      impostati tramite ALTER DATABASE, senza passare per Vault.
*/

-- ============================================================================
-- ALTERNATIVE: Impostare direttamente (senza Vault)
-- ============================================================================

/*
Se preferisci non usare Vault, puoi impostare direttamente:

ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://tuo-progetto.supabase.co';

ALTER DATABASE postgres 
SET app.settings.service_role_key = 'eyJ...tua-service-role-key';

Poi ricarica la configurazione:
SELECT pg_reload_conf();

ATTENZIONE: Questo metodo è meno sicuro perché le chiavi sono visibili
            nelle impostazioni del database. Usa Vault se possibile.
*/

-- ============================================================================
-- CLEANUP (se vuoi rimuovere tutto)
-- ============================================================================

/*
-- Rimuovi il cron job
SELECT cron.unschedule('check-missing-attendance-job');

-- Rimuovi la funzione
DROP FUNCTION IF EXISTS public.trigger_attendance_check_via_edge_function();

-- Rimuovi le impostazioni
ALTER DATABASE postgres RESET app.settings.supabase_url;
ALTER DATABASE postgres RESET app.settings.service_role_key;
*/

-- ============================================================================
-- FINE SETUP
-- ============================================================================

COMMENT ON FUNCTION public.trigger_attendance_check_via_edge_function() IS 
'Chiama l''Edge Function check-missing-attendance usando le variabili d''ambiente di Supabase.
Schedulato da pg_cron ogni 15 minuti durante l''orario lavorativo.
ZERO HARDCODE: URL e chiavi vengono da app.settings o Vault.';


