
-- Prima verifico quali template esistono
SELECT template_type, COUNT(*) FROM email_templates GROUP BY template_type;

-- Aggiungi solo la colonna notify_employee per ora
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS notify_employee boolean DEFAULT true;

-- Aggiungi i nuovi tipi di template senza rimuovere quelli esistenti
ALTER TABLE email_templates 
DROP CONSTRAINT IF EXISTS email_templates_template_type_check;

ALTER TABLE email_templates 
ADD CONSTRAINT email_templates_template_type_check 
CHECK (template_type IN ('documenti', 'notifiche', 'approvazioni', 'generale', 'permessi-richiesta', 'permessi-approvazione', 'permessi-rifiuto'));
