
-- Creazione tabella per i giorni festivi aziendali
CREATE TABLE public.company_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_admin_date UNIQUE(admin_id, date)
);

-- Abilita Row Level Security
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli admin di vedere solo le proprie festività
CREATE POLICY "Admins can view their own company holidays"
  ON public.company_holidays
  FOR SELECT
  USING (admin_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Policy per permettere agli admin di inserire festività
CREATE POLICY "Admins can insert their own company holidays"
  ON public.company_holidays
  FOR INSERT
  WITH CHECK (admin_id = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Policy per permettere agli admin di aggiornare le proprie festività
CREATE POLICY "Admins can update their own company holidays"
  ON public.company_holidays
  FOR UPDATE
  USING (admin_id = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Policy per permettere agli admin di eliminare le proprie festività
CREATE POLICY "Admins can delete their own company holidays"
  ON public.company_holidays
  FOR DELETE
  USING (admin_id = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Policy per permettere ai dipendenti di vedere le festività (sola lettura)
CREATE POLICY "Employees can view company holidays"
  ON public.company_holidays
  FOR SELECT
  USING (true);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION public.update_company_holidays_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_company_holidays_updated_at
  BEFORE UPDATE ON public.company_holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_company_holidays_updated_at();

-- Indici per performance
CREATE INDEX idx_company_holidays_date ON public.company_holidays(date);
CREATE INDEX idx_company_holidays_admin_id ON public.company_holidays(admin_id);
CREATE INDEX idx_company_holidays_recurring ON public.company_holidays(is_recurring);
