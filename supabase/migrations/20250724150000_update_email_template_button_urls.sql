-- Update all existing email templates to use the new domain
UPDATE public.email_templates 
SET button_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
WHERE button_url = 'https://alm-app.lovable.app/'
   OR button_url IS NULL;

-- Update the default value for new templates
ALTER TABLE public.email_templates 
ALTER COLUMN button_url SET DEFAULT 'https://finestra-gestione-aziendale-pro.vercel.app/'; 