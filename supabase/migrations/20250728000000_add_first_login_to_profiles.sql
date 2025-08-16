-- Aggiungi il campo first_login alla tabella profiles
-- Questo campo indica se l'utente ha effettuato il primo accesso e deve cambiare la password

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;

-- Aggiorna tutti i profili esistenti per impostare first_login = false
-- (gli utenti esistenti hanno già effettuato il primo accesso)
UPDATE public.profiles 
SET first_login = false 
WHERE first_login IS NULL;

-- Aggiungi un commento per spiegare il campo
COMMENT ON COLUMN profiles.first_login IS 'Indica se l''utente deve ancora effettuare il primo accesso e cambiare la password assegnata dall''amministratore';

-- Crea un indice per migliorare le performance delle query
CREATE INDEX IF NOT EXISTS idx_profiles_first_login ON public.profiles(first_login);

-- Verifica che la migrazione sia stata applicata correttamente
SELECT 
  '✅ Campo first_login aggiunto con successo' as status,
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE first_login = true) as first_login_users,
  COUNT(*) FILTER (WHERE first_login = false) as existing_users
FROM public.profiles;
