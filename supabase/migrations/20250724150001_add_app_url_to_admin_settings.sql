-- Add app_url field to admin_settings table
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS app_url text DEFAULT 'https://finestra-gestione-aziendale-pro.vercel.app/';

-- Update existing records to have the new default URL
UPDATE public.admin_settings 
SET app_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
WHERE app_url IS NULL; 