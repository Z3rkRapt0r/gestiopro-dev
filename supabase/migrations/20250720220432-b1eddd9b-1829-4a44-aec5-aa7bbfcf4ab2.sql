
-- Inserisce i template mancanti per le richieste di ferie e permessi inviate ai amministratori
INSERT INTO public.email_templates (
  admin_id,
  template_type,
  template_category,
  name,
  subject,
  content,
  is_default,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  footer_text,
  footer_color,
  show_admin_notes,
  show_leave_details,
  show_details_button,
  show_button,
  button_text,
  button_url
) VALUES 
-- Template per richieste di ferie inviate agli amministratori
(
  '4d2f24be-ed12-4541-b894-faa7dc780fa5',
  'ferie-richiesta',
  'amministratori',
  'Richiesta Ferie da Dipendente',
  'Nuova Richiesta Ferie da {employee_name}',
  'Gentile Amministratore,

È stata ricevuta una nuova richiesta di ferie da {employee_name}.

Dettagli della richiesta:
- Dipendente: {employee_name}
- Periodo richiesto: verificare nella dashboard

Accedi alla dashboard per approvare o rifiutare la richiesta.',
  false,
  '#007bff',
  '#6c757d',
  '#ffffff',
  '#333333',
  '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820',
  '#888888',
  true,
  true,
  true,
  true,
  'Gestisci Richiesta',
  'https://alm-app.lovable.app/'
),
-- Template per richieste di permessi inviate agli amministratori
(
  '4d2f24be-ed12-4541-b894-faa7dc780fa5',
  'permessi-richiesta',
  'amministratori',
  'Richiesta Permesso da Dipendente',
  'Nuova Richiesta Permesso da {employee_name}',
  'Gentile Amministratore,

È stata ricevuta una nuova richiesta di permesso da {employee_name}.

Dettagli della richiesta:
- Dipendente: {employee_name}
- Tipo: Permesso
- Dettagli: verificare nella dashboard

Accedi alla dashboard per approvare o rifiutare la richiesta.',
  false,
  '#007bff',
  '#6c757d',
  '#ffffff',
  '#333333',
  '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820',
  '#888888',
  true,
  true,
  true,
  true,
  'Gestisci Richiesta',
  'https://alm-app.lovable.app/'
);
