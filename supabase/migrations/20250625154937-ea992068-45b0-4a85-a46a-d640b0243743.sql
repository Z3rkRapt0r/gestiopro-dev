
-- Aggiorna il constraint per includere tutti i tipi di template necessari
ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS check_template_type;

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
