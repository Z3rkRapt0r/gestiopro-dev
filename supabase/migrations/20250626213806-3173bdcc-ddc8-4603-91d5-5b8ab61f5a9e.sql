
-- Add button configuration fields to email_templates table (without constraints since they already exist)
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS show_button boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS button_text text DEFAULT 'Accedi alla Dashboard',
ADD COLUMN IF NOT EXISTS button_url text DEFAULT 'https://alm-app.lovable.app/';
