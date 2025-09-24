-- Script per correggere l'errore di ricorsione infinita nelle politiche RLS

-- 1. Rimuovi tutte le politiche esistenti
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- 2. Crea politiche RLS semplici senza ricorsione

-- Politica per SELECT: Gli utenti possono vedere il proprio profilo
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Politica per UPDATE: Gli utenti possono aggiornare il proprio profilo
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Politica per INSERT: Permetti l'inserimento di profili (per il trigger)
CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Politica per DELETE: Solo gli utenti possono eliminare il proprio profilo
CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- 3. Verifica che le politiche siano state create correttamente
SELECT 
  'POLICIES CREATED' as status,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 4. Test di accesso
-- Prima fai login nell'app, poi esegui:
-- SELECT auth.uid() as current_user_id;
-- SELECT * FROM public.profiles WHERE id = auth.uid();



