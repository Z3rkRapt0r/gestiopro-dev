
-- Add the color columns for admin notes and leave details sections
ALTER TABLE public.email_templates 
ADD COLUMN admin_notes_bg_color text DEFAULT '#f8f9fa',
ADD COLUMN admin_notes_text_color text DEFAULT '#495057',
ADD COLUMN leave_details_bg_color text DEFAULT '#e3f2fd',
ADD COLUMN leave_details_text_color text DEFAULT '#1565c0';
