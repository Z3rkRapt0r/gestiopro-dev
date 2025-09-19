-- Disable email buttons for all existing templates
-- This migration removes buttons from all email templates in the database

-- Update all existing email templates to disable buttons
UPDATE public.email_templates 
SET show_button = false
WHERE show_button = true;

-- Also ensure button_text and button_url are set to default values
UPDATE public.email_templates 
SET button_text = 'Accedi alla Dashboard',
    button_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
WHERE button_text IS NULL OR button_url IS NULL;

-- Update the default value for new templates to disable buttons by default
ALTER TABLE public.email_templates 
ALTER COLUMN show_button SET DEFAULT false;
