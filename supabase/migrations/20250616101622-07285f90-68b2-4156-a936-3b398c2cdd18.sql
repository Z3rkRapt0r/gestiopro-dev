
-- Crea una tabella dedicata per le impostazioni di login
CREATE TABLE public.login_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  company_name TEXT NOT NULL DEFAULT 'ALM Infissi',
  primary_color TEXT NOT NULL DEFAULT '#2563eb',
  secondary_color TEXT NOT NULL DEFAULT '#64748b',
  background_color TEXT NOT NULL DEFAULT '#f1f5f9',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(admin_id)
);

-- Abilita Row Level Security
ALTER TABLE public.login_settings ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli admin di vedere solo le proprie impostazioni
CREATE POLICY "Admins can view their own login settings" 
  ON public.login_settings 
  FOR SELECT 
  USING (auth.uid() = admin_id);

-- Policy per permettere agli admin di inserire le proprie impostazioni
CREATE POLICY "Admins can insert their own login settings" 
  ON public.login_settings 
  FOR INSERT 
  WITH CHECK (auth.uid() = admin_id);

-- Policy per permettere agli admin di aggiornare le proprie impostazioni
CREATE POLICY "Admins can update their own login settings" 
  ON public.login_settings 
  FOR UPDATE 
  USING (auth.uid() = admin_id);

-- Policy per permettere agli admin di eliminare le proprie impostazioni
CREATE POLICY "Admins can delete their own login settings" 
  ON public.login_settings 
  FOR DELETE 
  USING (auth.uid() = admin_id);

-- Trigger per aggiornare automatically updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER login_settings_updated_at
  BEFORE UPDATE ON public.login_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Policy speciale per permettere lettura pubblica delle impostazioni di login
-- (necessario per la pagina di login quando l'utente non è autenticato)
CREATE POLICY "Public can view login settings for login page" 
  ON public.login_settings 
  FOR SELECT 
  TO anon
  USING (true);
