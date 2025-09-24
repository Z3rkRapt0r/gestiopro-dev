-- Script per testare la query esatta che usa l'applicazione

-- 1. Simula la query che fa l'app: SELECT * FROM profiles WHERE id = userId
-- Sostituisci l'ID con il tuo ID reale
SELECT 
  'APP QUERY TEST' as test_name,
  *
FROM public.profiles 
WHERE id = 'your-user-id-here';

-- 2. Test con auth.uid() (dopo aver fatto login nell'app)
-- SELECT auth.uid() as current_user_id;
-- SELECT * FROM public.profiles WHERE id = auth.uid();

-- 3. Verifica i permessi dell'utente corrente
-- SELECT current_user, session_user;

-- 4. Test di accesso con condizioni RLS
-- SELECT * FROM public.profiles WHERE id = auth.uid() AND auth.uid() = id;

-- 5. Verifica se ci sono errori nei log
-- Controlla Supabase Dashboard → Logs per errori specifici



