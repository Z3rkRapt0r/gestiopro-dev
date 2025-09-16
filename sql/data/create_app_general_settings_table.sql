-- Script per creare la tabella app_general_settings nel database Supabase
-- Esegui questo script direttamente nel database Supabase

-- Crea la tabella per le impostazioni generali dell'applicazione
CREATE TABLE IF NOT EXISTS public.app_general_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_title TEXT NOT NULL DEFAULT 'SerramentiCorp - Gestione Aziendale',
  app_description TEXT DEFAULT 'Sistema di gestione aziendale per imprese di serramenti',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(admin_id)
);

-- Abilita Row Level Security
ALTER TABLE public.app_general_settings ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli admin di vedere solo le proprie impostazioni
DROP POLICY IF EXISTS "Admins can view their app general settings" ON public.app_general_settings;
CREATE POLICY "Admins can view their app general settings" 
  ON public.app_general_settings 
  FOR SELECT 
  USING (auth.uid() = admin_id);

-- Policy per permettere agli admin di inserire le proprie impostazioni
DROP POLICY IF EXISTS "Admins can insert their app general settings" ON public.app_general_settings;
CREATE POLICY "Admins can insert their app general settings" 
  ON public.app_general_settings 
  FOR INSERT 
  WITH CHECK (auth.uid() = admin_id);

-- Policy per permettere agli admin di aggiornare le proprie impostazioni
DROP POLICY IF EXISTS "Admins can update their app general settings" ON public.app_general_settings;
CREATE POLICY "Admins can update their app general settings" 
  ON public.app_general_settings 
  FOR UPDATE 
  USING (auth.uid() = admin_id);

-- Policy per permettere agli admin di eliminare le proprie impostazioni
DROP POLICY IF EXISTS "Admins can delete their app general settings" ON public.app_general_settings;
CREATE POLICY "Admins can delete their app general settings" 
  ON public.app_general_settings 
  FOR DELETE 
  USING (auth.uid() = admin_id);

-- Policy speciale per permettere lettura pubblica delle impostazioni generali
-- (necessario per impostare il titolo della tab anche quando l'utente non è autenticato)
DROP POLICY IF EXISTS "Public can view app general settings" ON public.app_general_settings;
CREATE POLICY "Public can view app general settings" 
  ON public.app_general_settings 
  FOR SELECT 
  USING (true);

-- Crea o sostituisci la funzione per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION public.handle_app_general_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea o sostituisci il trigger
DROP TRIGGER IF EXISTS app_general_settings_updated_at ON public.app_general_settings;
CREATE TRIGGER app_general_settings_updated_at
  BEFORE UPDATE ON public.app_general_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_app_general_settings_updated_at();

-- Inserisci impostazioni di default per gli admin esistenti
INSERT INTO public.app_general_settings (admin_id, app_title, app_description)
SELECT id, 'SerramentiCorp - Gestione Aziendale', 'Sistema di gestione aziendale per imprese di serramenti'
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (admin_id) DO NOTHING;

-- Verifica che la tabella sia stata creata correttamente
SELECT 
  '✅ Tabella app_general_settings creata con successo' as status,
  COUNT(*) as admin_count
FROM public.app_general_settings;
