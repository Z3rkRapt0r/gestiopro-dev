-- Script per diagnosticare l'errore di caricamento del profilo

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

-- 3. Test della query esatta che usa l'app (simula auth.uid())
-- Prima fai login nell'app, poi esegui:
-- SELECT auth.uid() as current_user_id;

-- 4. Test della query con auth.uid() (simula quello che fa l'app)
-- SELECT * FROM public.profiles WHERE id = auth.uid();

-- 5. Verifica le politiche RLS attuali
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
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 6. Test di accesso diretto (bypass RLS per test)
SET row_security = off;
SELECT * FROM public.profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
SET row_security = on;

-- 7. Verifica i permessi dell'utente corrente
-- SELECT current_user, session_user;
-- SELECT * FROM information_schema.role_table_grants WHERE table_name = 'profiles';



