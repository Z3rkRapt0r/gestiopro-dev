-- Script completo per diagnosticare il problema di autenticazione

-- 1. Verifica che l'utente esista in auth.users
SELECT 
  'AUTH USERS CHECK' as test_name,
  id, 
  email, 
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'EMAIL CONFIRMED'
    ELSE 'EMAIL NOT CONFIRMED'
  END as email_status
FROM auth.users 
WHERE email = 'your-email@example.com';

-- 2. Verifica il profilo nella tabella profiles
SELECT 
  'PROFILES CHECK' as test_name,
  id,
  first_name,
  last_name,
  email,
  role,
  department,
  is_active,
  first_login,
  created_at,
  updated_at,
  CASE 
    WHEN is_active = true THEN 'ACTIVE'
    ELSE 'INACTIVE'
  END as status
FROM public.profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 3. Verifica che i dati siano coerenti tra auth.users e profiles
SELECT 
  'DATA CONSISTENCY CHECK' as test_name,
  u.id as auth_id,
  p.id as profile_id,
  u.email as auth_email,
  p.email as profile_email,
  CASE 
    WHEN u.id = p.id THEN 'IDS MATCH'
    ELSE 'IDS DO NOT MATCH'
  END as id_match,
  CASE 
    WHEN u.email = p.email THEN 'EMAILS MATCH'
    ELSE 'EMAILS DO NOT MATCH'
  END as email_match
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'your-email@example.com';

-- 4. Verifica le politiche RLS attuali
SELECT 
  'RLS POLICIES CHECK' as test_name,
  policyname, 
  cmd, 
  qual,
  CASE 
    WHEN qual IS NULL THEN 'NO CONDITIONS'
    ELSE 'HAS CONDITIONS'
  END as condition_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 5. Test di accesso diretto (bypass RLS)
SELECT 
  'DIRECT ACCESS TEST' as test_name,
  'RLS DISABLED' as status
FROM public.profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 6. Verifica se ci sono errori nei log
-- Controlla Supabase Dashboard → Logs per errori specifici



