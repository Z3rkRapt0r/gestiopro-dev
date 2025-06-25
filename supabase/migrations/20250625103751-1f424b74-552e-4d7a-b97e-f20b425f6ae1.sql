
-- Rimuovi TUTTI i template esistenti per evitare conflitti
TRUNCATE TABLE public.email_templates RESTART IDENTITY CASCADE;

-- Verifica che la tabella sia completamente vuota
DELETE FROM public.email_templates WHERE id IS NOT NULL;

-- Rimuovi e ricrea il constraint per essere sicuri
ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS email_templates_admin_type_category_unique;

ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS email_templates_admin_type_unique;

-- Ricrea il constraint corretto
ALTER TABLE public.email_templates 
ADD CONSTRAINT email_templates_admin_type_category_unique 
UNIQUE (admin_id, template_type, template_category);

-- Verifica che i constraint sui valori siano corretti
ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS check_template_type;

ALTER TABLE public.email_templates 
ADD CONSTRAINT check_template_type 
CHECK (template_type IN ('documenti', 'notifiche', 'approvazioni', 'permessi-richiesta', 'permessi-approvazione', 'permessi-rifiuto', 'generale'));

ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS check_template_category;

ALTER TABLE public.email_templates 
ADD CONSTRAINT check_template_category 
CHECK (template_category IN ('dipendenti', 'amministratori', 'generale'));
