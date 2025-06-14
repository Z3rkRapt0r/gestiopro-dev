
-- Tabella per salvare i template email per ogni amministratore
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Politiche di RLS per garantire che ogni admin legga e aggiorni solo i suoi template
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their templates"
    ON public.email_templates FOR SELECT
    USING (admin_id = auth.uid());

CREATE POLICY "Admins can insert their templates"
    ON public.email_templates FOR INSERT
    WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can update their templates"
    ON public.email_templates FOR UPDATE
    USING (admin_id = auth.uid());

CREATE POLICY "Admins can delete their templates"
    ON public.email_templates FOR DELETE
    USING (admin_id = auth.uid());

-- Trigger per aggiornare updated_at automaticamente
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
