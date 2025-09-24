-- Script per testare il caricamento del profilo

-- 1. Verifica che l'utente esista e sia attivo
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  u.last_sign_in_at
FROM auth.users u
WHERE u.email = 'your-email@example.com';

-- 2. Verifica il profilo con tutti i dettagli
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.role,
  p.department,
  p.is_active,
  p.first_login,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE p.id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 3. Test della query esatta che usa l'app
-- (Simula la query: SELECT * FROM profiles WHERE id = userId)
SELECT 
  p.*
FROM public.profiles p
WHERE p.id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 4. Verifica le politiche RLS per la tabella profiles
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
ORDER BY policyname;

-- 5. Test di accesso con auth.uid() (simula l'utente loggato)
-- Prima fai login nell'app, poi esegui:
-- SELECT auth.uid() as current_user_id;
-- SELECT * FROM public.profiles WHERE id = auth.uid();

-- 6. Verifica se ci sono errori nei log
-- Controlla Supabase Dashboard → Logs per errori RLS


