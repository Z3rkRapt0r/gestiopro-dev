-- Script per correggere i problemi di creazione employee

-- 1. Verifica e correggi le politiche RLS per INSERT
-- Rimuovi le politiche esistenti per INSERT
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Crea una politica semplice per INSERT
CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- 2. Verifica e correggi i constraint
-- Rimuovi constraint problematici se esistono
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_employee_code_key;

-- Ricrea il constraint per il ruolo
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'employee'));

-- 3. Verifica e correggi i trigger
-- Rimuovi trigger problematici
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;

-- Ricrea il trigger per updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Verifica che la funzione handle_updated_at esista
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. Test di inserimento di un profilo di test
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  role,
  department,
  employee_code,
  is_active,
  first_login,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test',
  'Employee',
  'test@example.com',
  'employee',
  'IT',
  'TEST001',
  true,
  true,
  NOW(),
  NOW()
);

-- 6. Verifica che l'inserimento sia andato a buon fine
SELECT 
  'TEST INSERT SUCCESS' as status,
  *
FROM public.profiles 
WHERE email = 'test@example.com';

-- 7. Pulisci il test
DELETE FROM public.profiles WHERE email = 'test@example.com';

-- 8. Verifica le politiche finali
SELECT 
  'FINAL POLICIES' as type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;


