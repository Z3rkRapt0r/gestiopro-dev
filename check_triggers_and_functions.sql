-- Script per verificare trigger e funzioni che potrebbero causare errori

-- 1. Verifica i trigger sulla tabella profiles
SELECT 
  'PROFILES TRIGGERS' as type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles' 
AND event_object_schema = 'public';

-- 2. Verifica le funzioni correlate
SELECT 
  'TRIGGER FUNCTIONS' as type,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%profile%'
OR routine_name LIKE '%user%';

-- 3. Verifica se la funzione handle_updated_at esiste e funziona
SELECT 
  'HANDLE_UPDATED_AT FUNCTION' as type,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_updated_at';

-- 4. Se la funzione non esiste, creala
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. Ricrea il trigger per updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Verifica che il trigger sia stato creato
SELECT 
  'TRIGGER CREATED' as type,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'profiles' 
AND event_object_schema = 'public';


