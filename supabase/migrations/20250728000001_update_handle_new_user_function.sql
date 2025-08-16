-- Aggiorna la funzione handle_new_user per impostare first_login = true per i nuovi utenti
-- Questo garantisce che i nuovi dipendenti debbano cambiare password al primo accesso

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role, first_login)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    true -- Imposta first_login = true per tutti i nuovi utenti
  );
  RETURN NEW;
END;
$$;

-- Verifica che la funzione sia stata aggiornata
SELECT 
  '✅ Funzione handle_new_user aggiornata con successo' as status,
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname = 'handle_new_user';
