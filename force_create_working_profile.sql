-- Script per forzare la creazione di un profilo funzionante

-- 1. Trova l'ID dell'utente
SELECT 
  'USER ID FOUND' as status,
  id,
  email
FROM auth.users 
WHERE email = 'your-email@example.com';

-- 2. Elimina il profilo esistente (se presente)
DELETE FROM public.profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 3. Crea un profilo completamente nuovo e funzionante
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
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  'Admin',  -- Sostituisci con il tuo nome
  'User',   -- Sostituisci con il tuo cognome
  'your-email@example.com',
  'admin',  -- o 'employee' se non sei admin
  'IT',     -- Sostituisci con il tuo dipartimento
  'ADMIN001', -- Sostituisci con un codice univoco
  true,     -- is_active
  true,     -- first_login
  NOW(),    -- created_at
  NOW()     -- updated_at
);

-- 4. Verifica che il profilo sia stato creato correttamente
SELECT 
  'PROFILE CREATED' as status,
  id,
  first_name,
  last_name,
  email,
  role,
  department,
  is_active,
  first_login,
  created_at,
  updated_at
FROM public.profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 5. Test di accesso diretto
SELECT 
  'ACCESS TEST' as status,
  'SUCCESS' as result,
  *
FROM public.profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');



