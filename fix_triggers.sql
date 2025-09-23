-- Script per correggere i trigger per la gestione dei profili

-- 1. Rimuovi i trigger esistenti problematici
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;

-- 2. Rimuovi le funzioni esistenti problematiche
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- 3. Ricrea la funzione handle_new_user corretta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Crea il profilo per il nuovo utente
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    email,
    role,
    department,
    employee_code,
    is_active,
    first_login
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'General'),
    COALESCE(NEW.raw_user_meta_data->>'employee_code', 'EMP' || substr(NEW.id::text, 1, 8)),
    true,
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log l'errore ma non bloccare la creazione dell'utente
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Ricrea la funzione handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. Ricrea il trigger per nuovi utenti
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Ricrea il trigger per updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Verifica che i trigger siano stati creati correttamente
SELECT 
  'TRIGGERS CREATED' as status,
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name IN ('on_auth_user_created', 'profiles_updated_at');

-- 8. Test della funzione handle_new_user
-- SELECT public.handle_new_user();

