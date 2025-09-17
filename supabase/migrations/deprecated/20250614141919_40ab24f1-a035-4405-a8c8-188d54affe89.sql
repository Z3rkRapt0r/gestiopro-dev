
-- Tabella per salvare la chiave API Brevo per ogni amministratore
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brevo_api_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Politiche di RLS per garantire che ogni admin legga e aggiorni solo i suoi settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their setting"
    ON public.admin_settings FOR SELECT
    USING (admin_id = auth.uid());

CREATE POLICY "Admins can insert their setting"
    ON public.admin_settings FOR INSERT
    WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can update their setting"
    ON public.admin_settings FOR UPDATE
    USING (admin_id = auth.uid());

CREATE POLICY "Admins can delete their setting"
    ON public.admin_settings FOR DELETE
    USING (admin_id = auth.uid());
