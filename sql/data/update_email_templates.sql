-- Script per aggiornare tutti i template email con il nuovo URL
-- Esegui questo script direttamente nel database Supabase

-- Aggiorna tutti i template email per usare il nuovo dominio
UPDATE public.email_templates 
SET button_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
WHERE button_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
   OR button_url IS NULL;

-- Aggiorna le impostazioni admin per assicurarsi che app_url sia impostato
UPDATE public.admin_settings 
SET app_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
WHERE app_url IS NULL;

-- Imposta il valore di default per i nuovi template
ALTER TABLE public.email_templates 
ALTER COLUMN button_url SET DEFAULT 'https://finestra-gestione-aziendale-pro.vercel.app/';

-- Verifica che tutti i template siano stati aggiornati
SELECT id, name, template_type, button_url 
FROM public.email_templates 
ORDER BY created_at DESC; 