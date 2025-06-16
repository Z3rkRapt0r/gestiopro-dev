
-- Add the show_admin_notes column to the email_templates table
ALTER TABLE public.email_templates 
ADD COLUMN show_admin_notes boolean DEFAULT true;
