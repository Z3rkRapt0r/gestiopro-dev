-- Script per testare l'applicazione senza RLS

-- 1. Verifica che RLS sia disabilitato
SELECT 
  'RLS STATUS CHECK' as test,
  CASE 
    WHEN rowsecurity = false THEN 'RLS DISABLED - OK'
    ELSE 'RLS ENABLED - PROBLEMA'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 2. Verifica che non ci siano politiche
SELECT 
  'POLICIES CHECK' as test,
  CASE 
    WHEN COUNT(*) = 0 THEN 'NO POLICIES - OK'
    ELSE 'POLICIES EXIST - PROBLEMA'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 3. Test di accesso diretto alla tabella profiles
SELECT 
  'DIRECT ACCESS TEST' as test,
  'SUCCESS' as status,
  COUNT(*) as total_profiles
FROM public.profiles;

-- 4. Test di accesso al profilo dell'utente corrente
SELECT 
  'USER PROFILE ACCESS' as test,
  'SUCCESS' as status,
  *
FROM public.profiles 
WHERE id = 'b2a9521d-a426-4563-8c2e-6f558851c08c';

-- 5. Test di inserimento di un nuovo profilo
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
  'App',
  'Test',
  'app.test@example.com',
  'employee',
  'IT',
  'APP001',
  true,
  true,
  NOW(),
  NOW()
);

-- 6. Verifica che l'inserimento sia andato a buon fine
SELECT 
  'INSERT TEST' as test,
  'SUCCESS' as status,
  *
FROM public.profiles 
WHERE email = 'app.test@example.com';

-- 7. Test di aggiornamento del profilo
UPDATE public.profiles 
SET first_name = 'App Updated'
WHERE email = 'app.test@example.com';

-- 8. Verifica che l'aggiornamento sia andato a buon fine
SELECT 
  'UPDATE TEST' as test,
  'SUCCESS' as status,
  first_name
FROM public.profiles 
WHERE email = 'app.test@example.com';

-- 9. Pulisci il test
DELETE FROM public.profiles WHERE email = 'app.test@example.com';

-- 10. Verifica la pulizia
SELECT 
  'CLEANUP TEST' as test,
  'SUCCESS' as status,
  COUNT(*) as remaining_test_profiles
FROM public.profiles 
WHERE email = 'app.test@example.com';



