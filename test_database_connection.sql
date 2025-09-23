-- Script per testare la connessione al database

-- 1. Verifica che il database sia accessibile
SELECT 
  'DATABASE CONNECTION' as test,
  'SUCCESS' as status,
  current_database() as database_name,
  current_user as current_user,
  version() as postgres_version;

-- 2. Verifica che la tabella profiles esista e sia accessibile
SELECT 
  'PROFILES TABLE ACCESS' as test,
  'SUCCESS' as status,
  COUNT(*) as total_profiles
FROM public.profiles;

-- 3. Verifica che l'utente corrente possa leggere i propri dati
SELECT 
  'USER DATA ACCESS' as test,
  'SUCCESS' as status,
  auth.uid() as current_user_id;

-- 4. Verifica che l'utente corrente possa accedere al proprio profilo
SELECT 
  'PROFILE ACCESS' as test,
  'SUCCESS' as status,
  *
FROM public.profiles 
WHERE id = auth.uid();

-- 5. Verifica le politiche RLS attive
SELECT 
  'RLS POLICIES' as test,
  'ACTIVE' as status,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 6. Test di inserimento di un profilo di test
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
  'Connection',
  'Test',
  'connection.test@example.com',
  'employee',
  'IT',
  'CONN001',
  true,
  true,
  NOW(),
  NOW()
);

-- 7. Verifica che l'inserimento sia andato a buon fine
SELECT 
  'INSERT TEST' as test,
  'SUCCESS' as status,
  *
FROM public.profiles 
WHERE email = 'connection.test@example.com';

-- 8. Pulisci il test
DELETE FROM public.profiles WHERE email = 'connection.test@example.com';

-- 9. Verifica la pulizia
SELECT 
  'CLEANUP TEST' as test,
  'SUCCESS' as status,
  COUNT(*) as remaining_test_profiles
FROM public.profiles 
WHERE email = 'connection.test@example.com';

