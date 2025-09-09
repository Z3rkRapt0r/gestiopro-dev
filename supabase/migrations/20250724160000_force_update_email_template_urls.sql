-- Force update all email templates to use the new domain
-- This migration ensures all existing templates are updated

-- Update all email templates to use the new domain
UPDATE public.email_templates 
SET button_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
WHERE button_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
   OR button_url IS NULL;

-- Update admin_settings to ensure app_url is set
UPDATE public.admin_settings 
SET app_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
WHERE app_url IS NULL;

-- Ensure the default value is set for future templates
ALTER TABLE public.email_templates 
ALTER COLUMN button_url SET DEFAULT 'https://finestra-gestione-aziendale-pro.vercel.app/'; 