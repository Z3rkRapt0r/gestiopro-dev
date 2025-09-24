-- Script per disabilitare temporaneamente RLS e testare

-- 1. Disabilita RLS sulla tabella profiles (TEMPORANEO)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Test di accesso diretto
SELECT 
  'RLS DISABLED TEST' as test,
  'SUCCESS' as status,
  *
FROM public.profiles 
WHERE id = '4262c811-5e05-4ae9-a04f-861cd2c44af7';

-- 3. Test con auth.uid() (dopo aver fatto login nell'app)
-- SELECT auth.uid() as current_user_id;
-- SELECT * FROM public.profiles WHERE id = auth.uid();

-- 4. Se funziona, riabilita RLS e ricrea le politiche
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Ricrea le politiche RLS corrette
-- Esegui clean_rls_policies.sql dopo aver riabilitato RLS


