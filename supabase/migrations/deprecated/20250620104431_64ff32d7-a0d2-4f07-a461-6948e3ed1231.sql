
-- Creiamo una tabella dedicata per le impostazioni delle presenze
CREATE TABLE public.attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_enabled BOOLEAN NOT NULL DEFAULT true,
  company_latitude DOUBLE PRECISION,
  company_longitude DOUBLE PRECISION,
  attendance_radius_meters INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inseriamo le impostazioni esistenti dalla tabella admin_settings
INSERT INTO public.attendance_settings (checkout_enabled, company_latitude, company_longitude, attendance_radius_meters)
SELECT checkout_enabled, company_latitude, company_longitude, attendance_radius_meters
FROM public.admin_settings
LIMIT 1;

-- Abilita RLS
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

-- Policy per permettere a tutti gli utenti autenticati di leggere le impostazioni
CREATE POLICY "All authenticated users can view attendance settings"
  ON public.attendance_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy per permettere solo agli admin di modificare le impostazioni
CREATE POLICY "Only admins can modify attendance settings"
  ON public.attendance_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Aggiungiamo un trigger per l'updated_at
CREATE OR REPLACE FUNCTION update_attendance_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_settings_updated_at
  BEFORE UPDATE ON public.attendance_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_settings_updated_at();
