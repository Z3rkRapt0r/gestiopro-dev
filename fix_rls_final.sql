-- Script per riabilitare RLS e ricreare le politiche corrette

-- 1. Riabilita RLS sulla tabella profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Rimuovi tutte le politiche esistenti
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- 3. Crea politiche RLS semplici e funzionanti

-- Politica per SELECT: Gli utenti possono vedere il proprio profilo
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Politica per SELECT: Gli admin possono vedere tutti i profili
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politica per UPDATE: Gli utenti possono aggiornare il proprio profilo
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Politica per UPDATE: Gli admin possono aggiornare tutti i profili
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politica per INSERT: Gli admin possono inserire profili
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politica per DELETE: Gli admin possono eliminare profili
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Verifica che le politiche siano state create correttamente
SELECT 
  'POLICIES CREATED' as status,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 5. Test di accesso con RLS abilitato
-- Prima fai login nell'app, poi esegui:
-- SELECT auth.uid() as current_user_id;
-- SELECT * FROM public.profiles WHERE id = auth.uid();



