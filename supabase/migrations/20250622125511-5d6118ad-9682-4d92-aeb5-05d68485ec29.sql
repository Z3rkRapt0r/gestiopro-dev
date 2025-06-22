
-- Correggi il ruolo dell'utente da admin a employee
UPDATE public.profiles 
SET role = 'employee', updated_at = now()
WHERE id = '93ebde4f-b35b-41ec-8596-2b12d2567a61';

-- Verifica il risultato
SELECT id, first_name, last_name, email, role 
FROM public.profiles 
WHERE id = '93ebde4f-b35b-41ec-8596-2b12d2567a61';
