-- Script per aggiungere la colonna app_url alla tabella admin_settings
-- Esegui questo script PRIMA degli altri

-- 1. Aggiungi la colonna app_url se non esiste
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS app_url text DEFAULT 'https://finestra-gestione-aziendale-pro.vercel.app/';

-- 2. Aggiorna tutti i record esistenti per avere l'URL di default
UPDATE public.admin_settings 
SET app_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
WHERE app_url IS NULL;

-- 3. Verifica che la colonna sia stata aggiunta
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'admin_settings' 
AND column_name = 'app_url';

-- 4. Mostra i dati attuali
SELECT admin_id, app_url 
FROM public.admin_settings;
