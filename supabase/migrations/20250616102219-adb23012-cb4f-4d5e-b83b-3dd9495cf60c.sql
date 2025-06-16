
-- Crea una tabella dedicata per le impostazioni dei loghi dipendenti
CREATE TABLE public.employee_logo_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_default_logo_url TEXT,
  employee_logo_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(admin_id)
);

-- Abilita Row Level Security
ALTER TABLE public.employee_logo_settings ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli admin di vedere solo le proprie impostazioni
CREATE POLICY "Admins can view their own employee logo settings" 
  ON public.employee_logo_settings 
  FOR SELECT 
  USING (auth.uid() = admin_id);

-- Policy per permettere agli admin di inserire le proprie impostazioni
CREATE POLICY "Admins can insert their own employee logo settings" 
  ON public.employee_logo_settings 
  FOR INSERT 
  WITH CHECK (auth.uid() = admin_id);

-- Policy per permettere agli admin di aggiornare le proprie impostazioni
CREATE POLICY "Admins can update their own employee logo settings" 
  ON public.employee_logo_settings 
  FOR UPDATE 
  USING (auth.uid() = admin_id);

-- Policy per permettere agli admin di eliminare le proprie impostazioni
CREATE POLICY "Admins can delete their own employee logo settings" 
  ON public.employee_logo_settings 
  FOR DELETE 
  USING (auth.uid() = admin_id);

-- Policy per permettere lettura pubblica delle impostazioni loghi dipendenti
-- (necessario per i dipendenti quando sono autenticati)
CREATE POLICY "Public can view employee logo settings" 
  ON public.employee_logo_settings 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Trigger per aggiornare automatically updated_at
CREATE TRIGGER employee_logo_settings_updated_at
  BEFORE UPDATE ON public.employee_logo_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
