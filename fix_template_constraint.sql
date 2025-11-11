-- Fix constraint per includere employee-message
ALTER TABLE IF EXISTS email_templates
DROP CONSTRAINT IF EXISTS check_template_type;

ALTER TABLE IF EXISTS email_templates
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
  'ferie-rifiuto',
  'avviso-entrata',
  'employee-message'
));
