-- Script per risolvere i problemi di creazione employee

-- 1. Verifica la struttura della tabella profiles
SELECT 
  'PROFILES STRUCTURE' as type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Verifica i constraint esistenti
SELECT 
  'CONSTRAINTS' as type,
  constraint_name,
  constraint_type,
  check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'profiles';

-- 3. Verifica le politiche RLS per INSERT
SELECT 
  'INSERT POLICIES' as type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
AND cmd = 'INSERT';

-- 4. Rimuovi tutte le politiche esistenti per ricrearle
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- 5. Crea politiche RLS semplici e funzionanti
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- 6. Verifica che le politiche siano state create
SELECT 
  'POLICIES CREATED' as type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 7. Test di inserimento di un profilo di test
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

-- 8. Verifica che l'inserimento sia andato a buon fine
SELECT 
  'TEST SUCCESS' as status,
  *
FROM public.profiles 
WHERE email = 'test@example.com';

-- 9. Pulisci il test
DELETE FROM public.profiles WHERE email = 'test@example.com';


