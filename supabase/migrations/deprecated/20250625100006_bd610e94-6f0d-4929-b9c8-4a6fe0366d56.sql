
-- Add new fields to email_templates table for template categorization and improved functionality
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS template_category text DEFAULT 'generale',
ADD COLUMN IF NOT EXISTS text_alignment text DEFAULT 'left',
ADD COLUMN IF NOT EXISTS subject_editable boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS content_editable boolean DEFAULT true;

-- Update template_type constraint to include new categories
ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS check_template_type;

ALTER TABLE public.email_templates 
ADD CONSTRAINT check_template_type 
CHECK (template_type IN ('documenti', 'notifiche', 'approvazioni', 'permessi-richiesta', 'permessi-approvazione', 'permessi-rifiuto', 'generale'));

-- Add constraint for template_category
ALTER TABLE public.email_templates 
ADD CONSTRAINT check_template_category 
CHECK (template_category IN ('dipendenti', 'amministratori', 'generale'));

-- Add constraint for text_alignment
ALTER TABLE public.email_templates 
ADD CONSTRAINT check_text_alignment 
CHECK (text_alignment IN ('left', 'center', 'right', 'justify'));

-- Add global logo settings to admin_settings table
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS global_logo_url text,
ADD COLUMN IF NOT EXISTS global_logo_alignment text DEFAULT 'center',
ADD COLUMN IF NOT EXISTS global_logo_size text DEFAULT 'medium';

-- Add constraints for global logo settings
ALTER TABLE public.admin_settings 
ADD CONSTRAINT check_global_logo_alignment 
CHECK (global_logo_alignment IN ('left', 'center', 'right'));

ALTER TABLE public.admin_settings 
ADD CONSTRAINT check_global_logo_size 
CHECK (global_logo_size IN ('small', 'medium', 'large'));

-- Update existing templates to have proper categories
UPDATE public.email_templates 
SET template_category = 'dipendenti' 
WHERE template_type IN ('documenti', 'permessi-richiesta') 
AND template_category = 'generale';

UPDATE public.email_templates 
SET template_category = 'amministratori' 
WHERE template_type IN ('approvazioni', 'permessi-approvazione', 'permessi-rifiuto', 'notifiche') 
AND template_category = 'generale';

-- Create index for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_email_templates_category_type 
ON public.email_templates(admin_id, template_category, template_type);
