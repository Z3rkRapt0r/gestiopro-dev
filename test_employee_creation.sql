-- Script per testare la creazione di un employee dopo aver risolto RLS

-- 1. Test di inserimento di un profilo employee
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
  'test.employee@example.com',
  'employee',
  'IT',
  'TEST001',
  true,
  true,
  NOW(),
  NOW()
);

-- 2. Verifica che l'inserimento sia andato a buon fine
SELECT 
  'EMPLOYEE CREATED SUCCESSFULLY' as status,
  id,
  first_name,
  last_name,
  email,
  role,
  department,
  employee_code,
  is_active,
  first_login
FROM public.profiles 
WHERE email = 'test.employee@example.com';

-- 3. Test di accesso al profilo creato
SELECT 
  'ACCESS TEST' as status,
  'SUCCESS' as result,
  *
FROM public.profiles 
WHERE email = 'test.employee@example.com';

-- 4. Pulisci il test
DELETE FROM public.profiles WHERE email = 'test.employee@example.com';

-- 5. Verifica che la pulizia sia andata a buon fine
SELECT 
  'CLEANUP SUCCESS' as status,
  COUNT(*) as remaining_test_profiles
FROM public.profiles 
WHERE email = 'test.employee@example.com';

