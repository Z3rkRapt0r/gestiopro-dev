-- Aggiunge il campo max_permission_hours alla tabella app_general_settings
-- Questo campo permette all'admin di impostare il numero massimo di ore per i permessi

-- Aggiungi la colonna max_permission_hours
ALTER TABLE public.app_general_settings 
ADD COLUMN IF NOT EXISTS max_permission_hours INTEGER DEFAULT 8;

-- Aggiungi un commento per documentare il campo
COMMENT ON COLUMN public.app_general_settings.max_permission_hours IS 
'Numero massimo di ore che un dipendente può richiedere per un singolo permesso. Impostato dall''amministratore.';

-- Aggiorna le impostazioni esistenti con un valore di default
UPDATE public.app_general_settings 
SET max_permission_hours = 8 
WHERE max_permission_hours IS NULL;

-- Verifica che la colonna sia stata aggiunta correttamente
SELECT 
  '✅ Campo max_permission_hours aggiunto con successo' as status,
  COUNT(*) as settings_count,
  AVG(max_permission_hours) as avg_max_hours
FROM public.app_general_settings;
