-- Script per creare il profilo utente mancante
-- Sostituisci 'your-email@example.com' con la tua email reale

-- 1. Trova l'ID dell'utente in auth.users
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- 2. Crea il profilo nella tabella profiles
-- Sostituisci l'ID con quello trovato sopra
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  role,
  department,
  employee_code,
  is_active,
  first_login
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  'Admin',  -- Sostituisci con il tuo nome
  'User',   -- Sostituisci con il tuo cognome
  'your-email@example.com',
  'admin',  -- o 'employee' se non sei admin
  'IT',     -- Sostituisci con il tuo dipartimento
  'ADMIN001', -- Sostituisci con un codice univoco
  true,
  true
);

-- 3. Verifica che il profilo sia stato creato
-- SELECT * FROM public.profiles WHERE email = 'your-email@example.com';

