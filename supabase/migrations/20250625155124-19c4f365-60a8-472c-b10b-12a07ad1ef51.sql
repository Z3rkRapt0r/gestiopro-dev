
-- Verifica e rimuovi TUTTI i constraint che potrebbero causare il problema
ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS check_template_type;

ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS email_templates_template_type_check;

-- Ricrea il constraint con il nome corretto e tutti i valori necessari
ALTER TABLE public.email_templates 
ADD CONSTRAINT check_template_type 
CHECK (template_type IN (
  'documenti', 
  'notifiche', 
  'approvazioni', 
  'generale', 
  'permessi-richiesta', 
  'permessi-approvazione', 
  'permessi-rifiuto',
  'ferie-richiesta',
  'ferie-approvazione', 
  'ferie-rifiuto'
));
