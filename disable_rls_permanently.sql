-- Script per disabilitare RLS permanentemente e risolvere la ricorsione infinita

-- 1. DISABILITA COMPLETAMENTE RLS SULLA TABELLA PROFILES
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. RIMUOVI TUTTE LE POLITICHE ESISTENTI
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to select their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own profile" ON public.profiles;

-- 3. VERIFICA CHE NON CI SIANO PIÙ POLITICHE
SELECT 
  'POLICIES REMOVED' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 4. VERIFICA CHE RLS SIA DISABILITATO
SELECT 
  'RLS STATUS' as status,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 5. TESTA L'ACCESSO CON RLS DISABILITATO
SELECT 
  'RLS DISABLED TEST' as status,
  'SUCCESS' as result,
  COUNT(*) as total_profiles
FROM public.profiles;

-- 6. TESTA L'ACCESSO AL PROFILO DELL'UTENTE CORRENTE
SELECT 
  'USER PROFILE TEST' as status,
  'SUCCESS' as result,
  *
FROM public.profiles 
WHERE id = 'b2a9521d-a426-4563-8c2e-6f558851c08c';

-- 7. TESTA L'INSERIMENTO DI UN PROFILO DI TEST
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
  'test.rls.disabled@example.com',
  'employee',
  'IT',
  'TEST001',
  true,
  true,
  NOW(),
  NOW()
);

-- 8. VERIFICA CHE L'INSERIMENTO SIA ANDATO A BUON FINE
SELECT 
  'INSERT TEST SUCCESS' as status,
  *
FROM public.profiles 
WHERE email = 'test.rls.disabled@example.com';

-- 9. PULISCI IL TEST
DELETE FROM public.profiles WHERE email = 'test.rls.disabled@example.com';

-- 10. VERIFICA LA PULIZIA
SELECT 
  'CLEANUP SUCCESS' as status,
  COUNT(*) as remaining_test_profiles
FROM public.profiles 
WHERE email = 'test.rls.disabled@example.com';

