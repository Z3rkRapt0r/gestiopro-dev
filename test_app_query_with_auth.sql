-- Script per testare la query esatta che usa l'applicazione

-- 1. Simula la query che fa l'app: SELECT * FROM profiles WHERE id = auth.uid()
-- Prima fai login nell'app, poi esegui questo:
SELECT 
  'AUTH UID TEST' as test,
  auth.uid() as current_user_id;

-- 2. Test della query con auth.uid()
SELECT 
  'PROFILE QUERY TEST' as test,
  *
FROM public.profiles 
WHERE id = auth.uid();

-- 3. Test di accesso diretto con l'ID specifico
SELECT 
  'DIRECT ID TEST' as test,
  *
FROM public.profiles 
WHERE id = '4262c811-5e05-4ae9-a04f-861cd2c44af7';

-- 4. Verifica se auth.uid() restituisce l'ID corretto
SELECT 
  'AUTH UID COMPARISON' as test,
  auth.uid() as auth_uid,
  '4262c811-5e05-4ae9-a04f-861cd2c44af7' as expected_id,
  CASE 
    WHEN auth.uid() = '4262c811-5e05-4ae9-a04f-861cd2c44af7' THEN 'MATCH'
    ELSE 'NO MATCH'
  END as id_match;

-- 5. Test delle politiche RLS
SELECT 
  'RLS POLICY TEST' as test,
  auth.uid() = '4262c811-5e05-4ae9-a04f-861cd2c44af7' as condition_result;

-- 6. Verifica i permessi dell'utente corrente
SELECT 
  'PERMISSIONS TEST' as test,
  current_user,
  session_user,
  has_table_privilege('public.profiles', 'SELECT') as can_select,
  has_table_privilege('public.profiles', 'UPDATE') as can_update;

