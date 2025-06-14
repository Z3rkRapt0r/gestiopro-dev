
-- Disabilita temporaneamente RLS per vedere se il problema è davvero nelle policy
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Rimuovi tutte le policy esistenti
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Riabilita RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Crea una sola policy semplice per il SELECT
CREATE POLICY "Allow users to read own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Permetti inserimenti per tutti gli utenti autenticati (necessario per il trigger di registrazione)
CREATE POLICY "Allow profile creation" ON public.profiles
FOR INSERT WITH CHECK (true);

-- Permetti aggiornamenti solo del proprio profilo
CREATE POLICY "Allow users to update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);
