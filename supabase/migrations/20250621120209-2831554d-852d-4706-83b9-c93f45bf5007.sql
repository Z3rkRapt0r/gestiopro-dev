
-- Creiamo una nuova tabella per le presenze unificate
CREATE TABLE public.unified_attendances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  check_in_time text NULL,
  check_out_time text NULL,
  is_manual boolean NOT NULL DEFAULT false,
  is_business_trip boolean NOT NULL DEFAULT false,
  notes text NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Aggiungiamo gli indici per migliorare le performance
CREATE INDEX idx_unified_attendances_user_date ON public.unified_attendances(user_id, date);
CREATE INDEX idx_unified_attendances_date ON public.unified_attendances(date);

-- Abilitiamo RLS
ALTER TABLE public.unified_attendances ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli admin di vedere tutto
CREATE POLICY "Admins can view all unified attendances" ON public.unified_attendances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per permettere agli utenti di vedere solo le proprie presenze
CREATE POLICY "Users can view own unified attendances" ON public.unified_attendances
  FOR SELECT USING (user_id = auth.uid());

-- Policy per permettere agli admin di inserire/aggiornare
CREATE POLICY "Admins can manage unified attendances" ON public.unified_attendances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per permettere agli utenti di gestire le proprie presenze automatiche
CREATE POLICY "Users can manage own unified attendances" ON public.unified_attendances
  FOR ALL USING (user_id = auth.uid());

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_unified_attendances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER trigger_update_unified_attendances_updated_at
  BEFORE UPDATE ON public.unified_attendances
  FOR EACH ROW EXECUTE FUNCTION update_unified_attendances_updated_at();
