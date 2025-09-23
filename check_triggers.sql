-- Script per verificare i trigger esistenti

-- 1. Verifica i trigger sulla tabella auth.users
SELECT 
  'AUTH USERS TRIGGERS' as type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- 2. Verifica i trigger sulla tabella public.profiles
SELECT 
  'PROFILES TRIGGERS' as type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles' 
AND event_object_schema = 'public';

-- 3. Verifica le funzioni correlate ai trigger
SELECT 
  'TRIGGER FUNCTIONS' as type,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%user%' 
OR routine_name LIKE '%profile%';

-- 4. Verifica se esiste la funzione handle_new_user
SELECT 
  'HANDLE NEW USER FUNCTION' as type,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';

-- 5. Verifica i trigger specifici
SELECT 
  'SPECIFIC TRIGGERS' as type,
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user%' 
OR trigger_name LIKE '%profile%';

