-- Script per diagnosticare il caricamento del profilo

-- 1. Verifica che l'utente esista in auth.users
SELECT 
  id, 
  email, 
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'your-email@example.com';

-- 2. Verifica il profilo nella tabella profiles
SELECT 
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

-- 3. Test di accesso con auth.uid() (simula quello che fa l'app)
-- Prima fai login nell'app, poi esegui questo:
-- SELECT auth.uid() as current_user_id;

-- 4. Test di accesso al profilo (simula la query dell'app)
-- SELECT * FROM public.profiles WHERE id = auth.uid();

-- 5. Verifica le politiche RLS
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 6. Verifica se RLS è abilitato
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 7. Test di accesso diretto (bypass RLS per test)
-- SET row_security = off;
-- SELECT * FROM public.profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
-- SET row_security = on;



