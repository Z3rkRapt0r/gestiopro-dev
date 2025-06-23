
-- Inserisce il profilo per l'utente esistente che si è autenticato
INSERT INTO public.profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_active
) VALUES (
  '4d2f24be-ed12-4541-b894-faa7dc780fa5',
  'servizio@alminfissi.it',
  'Admin',
  'Sistema',
  'admin',
  true
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;
