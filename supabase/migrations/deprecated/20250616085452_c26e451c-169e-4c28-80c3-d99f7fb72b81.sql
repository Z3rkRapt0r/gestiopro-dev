
-- Tabella per le impostazioni globali della dashboard
CREATE TABLE public.dashboard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#007bff',
  secondary_color TEXT DEFAULT '#6c757d',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(admin_id)
);

-- Politiche RLS per dashboard_settings
ALTER TABLE public.dashboard_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their dashboard settings"
  ON public.dashboard_settings
  FOR ALL
  USING (admin_id = auth.uid());

-- Bucket per i loghi aziendali
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true);

-- Politiche per il bucket dei loghi
CREATE POLICY "Anyone can view company logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

CREATE POLICY "Admins can upload company logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can update company logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete company logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'company-logos' AND auth.role() = 'authenticated');
