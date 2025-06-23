
-- Aggiorna il ruolo dell'utente servizio@alminfissi.it da employee ad admin
UPDATE public.profiles 
SET role = 'admin', updated_at = now() 
WHERE email = 'servizio@alminfissi.it';
