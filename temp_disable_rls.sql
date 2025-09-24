-- Script per disabilitare temporaneamente RLS per test

-- 1. Disabilita RLS sulla tabella profiles (TEMPORANEO)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Test di accesso diretto
SELECT * FROM public.profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 3. Se funziona, riabilita RLS
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. E poi esegui clean_rls_policies.sql per ricreare le politiche corrette



