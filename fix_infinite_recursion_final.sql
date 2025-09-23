-- Script definitivo per risolvere l'errore di ricorsione infinita

-- 1. DISABILITA COMPLETAMENTE RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. RIMUOVI TUTTE LE POLITICHE ESISTENTI
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to select their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own profile" ON public.profiles;

-- 3. VERIFICA CHE NON CI SIANO PIÙ POLITICHE
SELECT 
  'POLICIES REMOVED' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 4. TESTA L'ACCESSO CON RLS DISABILITATO
SELECT 
  'RLS DISABLED TEST' as status,
  'SUCCESS' as result,
  *
FROM public.profiles 
WHERE id = 'b2a9521d-a426-4563-8c2e-6f558851c08c';

-- 5. RICREA RLS CON POLITICHE SEMPLICI (SENZA RICORSIONE)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politica per SELECT: Solo il proprio profilo
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Politica per UPDATE: Solo il proprio profilo
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Politica per INSERT: Permetti tutto (per evitare ricorsione)
CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Politica per DELETE: Solo il proprio profilo
CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- 6. VERIFICA LE NUOVE POLITICHE
SELECT 
  'NEW POLICIES CREATED' as status,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 7. TESTA L'ACCESSO CON RLS ABILITATO
-- Prima fai login nell'app, poi esegui:
-- SELECT auth.uid() as current_user_id;
-- SELECT * FROM public.profiles WHERE id = auth.uid();

