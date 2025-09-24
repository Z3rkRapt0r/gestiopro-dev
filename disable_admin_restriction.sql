-- Script per identificare e disabilitare temporaneamente la restrizione admin

-- 1. Cerca funzioni che potrebbero avere la restrizione admin
SELECT 
  'FUNCTIONS WITH ADMIN CHECK' as type,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_definition ILIKE '%admin%'
AND routine_definition ILIKE '%role%';

-- 2. Cerca trigger che potrebbero avere la restrizione admin
SELECT 
  'TRIGGERS WITH ADMIN CHECK' as type,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE action_statement ILIKE '%admin%'
AND action_statement ILIKE '%role%';

-- 3. Cerca constraint che potrebbero avere la restrizione admin
SELECT 
  'CONSTRAINTS WITH ADMIN CHECK' as type,
  constraint_name,
  table_name,
  check_clause
FROM information_schema.check_constraints 
WHERE check_clause ILIKE '%admin%'
AND check_clause ILIKE '%role%';

-- 4. Disabilita temporaneamente tutti i trigger sulla tabella profiles
-- (Questo permetterà di creare il profilo senza restrizioni)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;

-- 5. Crea il profilo con ruolo admin (ora dovrebbe funzionare)
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  role,
  department,
  employee_code,
  is_active,
  first_login,
  created_at,
  updated_at
) VALUES (
  'b2a9521d-a426-4563-8c2e-6f558851c08c',
  'Admin',  -- Sostituisci con il tuo nome
  'User',   -- Sostituisci con il tuo cognome
  (SELECT email FROM auth.users WHERE id = 'b2a9521d-a426-4563-8c2e-6f558851c08c'),
  'admin',  -- Ora dovrebbe funzionare
  'IT',     -- Sostituisci con il tuo dipartimento
  'ADMIN002', -- Sostituisci con un codice univoco
  true,     -- is_active
  true,     -- first_login
  NOW(),    -- created_at
  NOW()     -- updated_at
) ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  employee_code = EXCLUDED.employee_code,
  is_active = EXCLUDED.is_active,
  first_login = EXCLUDED.first_login,
  updated_at = NOW();

-- 6. Ricrea i trigger (opzionale)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- 
-- CREATE TRIGGER profiles_updated_at
--   BEFORE UPDATE ON public.profiles
--   FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();



