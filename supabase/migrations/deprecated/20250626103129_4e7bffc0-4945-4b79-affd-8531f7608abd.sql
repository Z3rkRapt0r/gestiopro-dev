
-- Add admin message columns to email_templates table
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS show_admin_message boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_message_bg_color text DEFAULT '#e3f2fd',
ADD COLUMN IF NOT EXISTS admin_message_text_color text DEFAULT '#1565c0';
