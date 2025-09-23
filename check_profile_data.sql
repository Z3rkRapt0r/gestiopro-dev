-- Script per verificare i dati del profilo

-- 1. Verifica l'utente in auth.users
SELECT 
  'AUTH USER' as type,
  id, 
  email, 
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'your-email@example.com';

-- 2. Verifica il profilo in profiles
SELECT 
  'PROFILE' as type,
  id,
  first_name,
  last_name,
  email,
  role,
  department,
  is_active,
  first_login,
  created_at,
  updated_at
FROM public.profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 3. Verifica la coerenza dei dati
SELECT 
  'CONSISTENCY' as type,
  u.id as auth_id,
  p.id as profile_id,
  u.email as auth_email,
  p.email as profile_email,
  p.role as profile_role,
  p.is_active,
  CASE 
    WHEN u.id = p.id THEN 'OK'
    ELSE 'ERROR'
  END as id_match,
  CASE 
    WHEN u.email = p.email THEN 'OK'
    ELSE 'ERROR'
  END as email_match
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'your-email@example.com';

-- 4. Test di accesso con auth.uid() (simula l'app)
-- Prima fai login nell'app, poi esegui:
-- SELECT auth.uid() as current_user_id;
-- SELECT * FROM public.profiles WHERE id = auth.uid();

