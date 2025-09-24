-- Script per testare il flusso di autenticazione completo

-- 1. Verifica che l'utente esista e sia attivo
SELECT 
  'AUTH USER STATUS' as test,
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'EMAIL CONFIRMED'
    ELSE 'EMAIL NOT CONFIRMED - PROBLEMA!'
  END as email_status
FROM auth.users 
WHERE email = 'your-email@example.com';

-- 2. Verifica il profilo corrispondente
SELECT 
  'PROFILE STATUS' as test,
  id,
  first_name,
  last_name,
  email,
  role,
  is_active,
  first_login,
  CASE 
    WHEN is_active = true THEN 'ACTIVE'
    ELSE 'INACTIVE - PROBLEMA!'
  END as profile_status
FROM public.profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 3. Test di accesso con auth.uid() (simula l'app)
-- Prima fai login nell'app, poi esegui:
-- SELECT auth.uid() as current_user_id;
-- SELECT * FROM public.profiles WHERE id = auth.uid();

-- 4. Verifica se ci sono errori nei log
-- Controlla Supabase Dashboard → Logs per errori specifici

-- 5. Test di accesso diretto (bypass RLS)
SELECT 
  'DIRECT ACCESS TEST' as test,
  'SUCCESS' as status,
  *
FROM public.profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 6. Verifica le politiche RLS
SELECT 
  'RLS POLICIES' as test,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;



