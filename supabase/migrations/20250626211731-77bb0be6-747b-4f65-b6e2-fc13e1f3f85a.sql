
-- Add button configuration fields to email_templates table
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS show_button boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS button_text text DEFAULT 'Accedi alla Dashboard',
ADD COLUMN IF NOT EXISTS button_url text DEFAULT 'https://your-app-url.com';

-- Add constraints for button fields
ALTER TABLE public.email_templates 
ADD CONSTRAINT check_button_text_length 
CHECK (char_length(button_text) <= 100);

ALTER TABLE public.email_templates 
ADD CONSTRAINT check_button_url_length 
CHECK (char_length(button_url) <= 500);
