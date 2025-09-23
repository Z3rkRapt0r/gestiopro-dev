-- Script per verificare e aggiornare il profilo esistente
-- Sostituisci 'your-email@example.com' con la tua email reale

-- 1. Verifica il profilo esistente
SELECT * FROM public.profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 2. Aggiorna il profilo esistente con i dati corretti
UPDATE public.profiles 
SET 
  first_name = 'Admin',  -- Sostituisci con il tuo nome
  last_name = 'User',    -- Sostituisci con il tuo cognome
  email = 'your-email@example.com',
  role = 'admin',        -- o 'employee' se non sei admin
  department = 'IT',     -- Sostituisci con il tuo dipartimento
  employee_code = 'ADMIN001', -- Sostituisci con un codice univoco
  is_active = true,
  first_login = true,
  updated_at = NOW()
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 3. Verifica che l'aggiornamento sia andato a buon fine
SELECT * FROM public.profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 4. Verifica che l'utente possa accedere al proprio profilo
-- (Esegui questo dopo aver fatto login nell'app)
SELECT 
  p.*,
  u.email as auth_email,
  u.email_confirmed_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'your-email@example.com';

