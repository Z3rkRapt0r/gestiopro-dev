
-- Abilita Row Level Security sulla tabella email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policy: ogni admin può vedere i suoi templates
CREATE POLICY "Admins can view their email templates" ON public.email_templates
  FOR SELECT USING (admin_id = auth.uid());

-- Policy: ogni admin può inserire templates per sé stesso
CREATE POLICY "Admins can insert their email templates" ON public.email_templates
  FOR INSERT WITH CHECK (admin_id = auth.uid());

-- Policy: ogni admin può modificare SOLO i suoi templates
CREATE POLICY "Admins can update their email templates" ON public.email_templates
  FOR UPDATE USING (admin_id = auth.uid());

-- Policy: ogni admin può cancellare SOLO i suoi templates
CREATE POLICY "Admins can delete their email templates" ON public.email_templates
  FOR DELETE USING (admin_id = auth.uid());
