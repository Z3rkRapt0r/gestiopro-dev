
-- Inserisci un utente admin predefinito nella tabella profiles
-- Nota: Questo utente dovrà essere creato manualmente in Supabase Auth o tramite registrazione iniziale
INSERT INTO public.profiles (id, first_name, last_name, email, role, is_active)
VALUES (
  '4d2f24be-ed12-4541-b894-faa7dc780fa5', -- ID dell'utente admin esistente
  'Admin',
  'SerramentiCorp',
  'admin@serramenticorp.com',
  'admin',
  true
) ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Aggiungi una policy per permettere agli admin di creare nuovi profili
CREATE POLICY "Admins can insert profiles" ON public.profiles
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permetti agli admin di visualizzare tutti i profili
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- Permetti agli admin di aggiornare tutti i profili
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);
