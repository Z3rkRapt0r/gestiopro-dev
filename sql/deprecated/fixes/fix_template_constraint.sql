-- Rimuovi il constraint esistente
ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS check_template_type;

-- Ricrea il constraint includendo 'avviso-entrata'
ALTER TABLE public.email_templates 
ADD CONSTRAINT check_template_type 
CHECK (template_type = ANY (ARRAY[
  'documenti'::text, 
  'notifiche'::text, 
  'approvazioni'::text, 
  'generale'::text, 
  'permessi-richiesta'::text, 
  'permessi-approvazione'::text, 
  'permessi-rifiuto'::text, 
  'ferie-richiesta'::text, 
  'ferie-approvazione'::text, 
  'ferie-rifiuto'::text,
  'avviso-entrata'::text
]));
