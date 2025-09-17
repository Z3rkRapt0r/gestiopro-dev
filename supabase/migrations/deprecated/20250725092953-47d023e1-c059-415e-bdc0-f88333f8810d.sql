-- Aggiorna la tabella admin_settings per sostituire brevo_api_key con resend_api_key
ALTER TABLE public.admin_settings 
RENAME COLUMN brevo_api_key TO resend_api_key;