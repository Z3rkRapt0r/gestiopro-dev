
-- Update the check constraint to include the new template types
ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS check_template_type;

ALTER TABLE public.email_templates 
ADD CONSTRAINT check_template_type 
CHECK (template_type IN ('documenti', 'notifiche', 'approvazioni', 'generale', 'permessi-richiesta', 'permessi-approvazione', 'permessi-rifiuto'));
