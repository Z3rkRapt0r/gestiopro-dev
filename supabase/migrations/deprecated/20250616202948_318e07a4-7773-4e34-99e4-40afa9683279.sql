
-- Add the missing columns for custom block functionality in email templates
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS show_custom_block boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_block_text text,
ADD COLUMN IF NOT EXISTS custom_block_bg_color text DEFAULT '#fff3cd',
ADD COLUMN IF NOT EXISTS custom_block_text_color text DEFAULT '#856404';
