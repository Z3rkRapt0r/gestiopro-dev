
-- Creare template per dipendenti per approvazione/rifiuto ferie e permessi
INSERT INTO public.email_templates (
  admin_id, 
  template_type, 
  template_category, 
  name, 
  subject, 
  content,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  footer_text,
  show_button,
  button_text,
  button_url
) 
SELECT 
  admin_id,
  'ferie-approvazione' as template_type,
  'dipendenti' as template_category,
  'Ferie Approvate - Per Dipendenti' as name,
  'Richiesta Ferie Approvata' as subject,
  'Gentile {employee_name},

La tua richiesta di ferie è stata approvata dall''amministratore.

Dettagli della richiesta:
{leave_details}

Note amministratore:
{admin_message}

Buone ferie!' as content,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  footer_text,
  show_button,
  button_text,
  button_url
FROM public.email_templates 
WHERE template_type = 'ferie-approvazione' AND template_category = 'amministratori'
ON CONFLICT (admin_id, template_type, template_category) DO NOTHING;

INSERT INTO public.email_templates (
  admin_id, 
  template_type, 
  template_category, 
  name, 
  subject, 
  content,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  footer_text,
  show_button,
  button_text,
  button_url
) 
SELECT 
  admin_id,
  'ferie-rifiuto' as template_type,
  'dipendenti' as template_category,
  'Ferie Rifiutate - Per Dipendenti' as name,
  'Richiesta Ferie Rifiutata' as subject,
  'Gentile {employee_name},

La tua richiesta di ferie è stata rifiutata dall''amministratore.

Dettagli della richiesta:
{leave_details}

Note amministratore:
{admin_message}

Per maggiori informazioni, contatta l''amministrazione.' as content,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  footer_text,
  show_button,
  button_text,
  button_url
FROM public.email_templates 
WHERE template_type = 'ferie-rifiuto' AND template_category = 'amministratori'
ON CONFLICT (admin_id, template_type, template_category) DO NOTHING;

INSERT INTO public.email_templates (
  admin_id, 
  template_type, 
  template_category, 
  name, 
  subject, 
  content,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  footer_text,
  show_button,
  button_text,
  button_url
) 
SELECT 
  admin_id,
  'permessi-approvazione' as template_type,
  'dipendenti' as template_category,
  'Permesso Approvato - Per Dipendenti' as name,
  'Richiesta Permesso Approvata' as subject,
  'Gentile {employee_name},

La tua richiesta di permesso è stata approvata dall''amministratore.

Dettagli della richiesta:
{leave_details}

Note amministratore:
{admin_message}

Grazie.' as content,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  footer_text,
  show_button,
  button_text,
  button_url
FROM public.email_templates 
WHERE template_type = 'permessi-approvazione' AND template_category = 'amministratori'
ON CONFLICT (admin_id, template_type, template_category) DO NOTHING;

INSERT INTO public.email_templates (
  admin_id, 
  template_type, 
  template_category, 
  name, 
  subject, 
  content,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  footer_text,
  show_button,
  button_text,
  button_url
) 
SELECT 
  admin_id,
  'permessi-rifiuto' as template_type,
  'dipendenti' as template_category,
  'Permesso Rifiutato - Per Dipendenti' as name,
  'Richiesta Permesso Rifiutata' as subject,
  'Gentile {employee_name},

La tua richiesta di permesso è stata rifiutata dall''amministratore.

Dettagli della richiesta:
{leave_details}

Note amministratore:
{admin_message}

Per maggiori informazioni, contatta l''amministrazione.' as content,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  footer_text,
  show_button,
  button_text,
  button_url
FROM public.email_templates 
WHERE template_type = 'permessi-rifiuto' AND template_category = 'amministratori'
ON CONFLICT (admin_id, template_type, template_category) DO NOTHING;
