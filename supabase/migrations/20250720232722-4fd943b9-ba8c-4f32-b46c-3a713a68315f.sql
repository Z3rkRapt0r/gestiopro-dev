
-- Aggiorna i template per rimuovere le duplicazioni delle note amministratore
-- Template ferie-approvazione per dipendenti
UPDATE email_templates 
SET content = 'Gentile {employee_name},

La tua richiesta di ferie è stata approvata.

Dettagli della richiesta:
{leave_details}

Buone vacanze!'
WHERE template_type = 'ferie-approvazione' 
AND template_category = 'amministratori'
AND content LIKE '%{admin_message}%';

-- Template ferie-rifiuto per dipendenti
UPDATE email_templates 
SET content = 'Gentile {employee_name},

La tua richiesta di ferie è stata rifiutata dall''amministratore.

Dettagli della richiesta:
{leave_details}

Per maggiori informazioni, contatta l''amministrazione.'
WHERE template_type = 'ferie-rifiuto' 
AND template_category = 'amministratori'
AND content LIKE '%{admin_message}%';

-- Template permessi-approvazione per dipendenti
UPDATE email_templates 
SET content = 'Gentile {employee_name},

La tua richiesta di permesso è stata approvata.

Dettagli della richiesta:
{leave_details}

Buona giornata!'
WHERE template_type = 'permessi-approvazione' 
AND template_category = 'amministratori'
AND content LIKE '%{admin_message}%';

-- Template permessi-rifiuto per dipendenti
UPDATE email_templates 
SET content = 'Gentile {employee_name},

La tua richiesta di permesso è stata rifiutata.

Dettagli della richiesta:
{leave_details}

Per maggiori informazioni, contatta l''amministrazione.'
WHERE template_type = 'permessi-rifiuto' 
AND template_category = 'amministratori'
AND content LIKE '%{admin_message}%';

-- Rimuovi anche eventuali riferimenti a {admin_note}
UPDATE email_templates 
SET content = REPLACE(content, E'\n\nNote amministratore:\n{admin_note}', '')
WHERE template_category = 'amministratori'
AND content LIKE '%{admin_note}%';

UPDATE email_templates 
SET content = REPLACE(content, E'\n\nNote amministratore:\n{admin_message}', '')
WHERE template_category = 'amministratori'
AND content LIKE '%{admin_message}%';
