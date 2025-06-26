
-- Add admin notes section columns to email_templates table
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS show_admin_notes_section boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS admin_notes_section_bg_color text DEFAULT '#e8f4fd',
ADD COLUMN IF NOT EXISTS admin_notes_section_text_color text DEFAULT '#2c5282';
