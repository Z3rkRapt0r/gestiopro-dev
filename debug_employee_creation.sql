-- Script per diagnosticare i problemi di creazione employee

-- 1. Verifica la struttura della tabella profiles
SELECT 
  'PROFILES TABLE STRUCTURE' as type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Verifica i constraint sulla tabella profiles
SELECT 
  'PROFILES CONSTRAINTS' as type,
  constraint_name,
  constraint_type,
  check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'profiles';

-- 3. Verifica i trigger sulla tabella profiles
SELECT 
  'PROFILES TRIGGERS' as type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles' 
AND event_object_schema = 'public';

-- 4. Verifica le politiche RLS per INSERT
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

-- 5. Test di inserimento di un profilo di test
-- (Questo ti dirà se ci sono errori specifici)
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
  gen_random_uuid(),
  'Test',
  'Employee',
  'test@example.com',
  'employee',
  'IT',
  'TEST001',
  true,
  true
);

-- 6. Verifica che l'inserimento sia andato a buon fine
SELECT 
  'TEST INSERT RESULT' as type,
  *
FROM public.profiles 
WHERE email = 'test@example.com';

-- 7. Pulisci il test
DELETE FROM public.profiles WHERE email = 'test@example.com';


