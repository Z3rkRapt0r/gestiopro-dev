
-- Creiamo una tabella per gli orari di lavoro e giorni lavorativi
CREATE TABLE public.work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '17:00:00',
  monday BOOLEAN NOT NULL DEFAULT true,
  tuesday BOOLEAN NOT NULL DEFAULT true,
  wednesday BOOLEAN NOT NULL DEFAULT true,
  thursday BOOLEAN NOT NULL DEFAULT true,
  friday BOOLEAN NOT NULL DEFAULT true,
  saturday BOOLEAN NOT NULL DEFAULT false,
  sunday BOOLEAN NOT NULL DEFAULT false,
  tolerance_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inseriamo un record di default
INSERT INTO public.work_schedules (start_time, end_time) VALUES ('08:00:00', '17:00:00');

-- Abilita RLS
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

-- Policy per permettere a tutti gli utenti autenticati di leggere gli orari
CREATE POLICY "All authenticated users can view work schedules"
  ON public.work_schedules
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy per permettere solo agli admin di modificare gli orari
CREATE POLICY "Only admins can modify work schedules"
  ON public.work_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger per updated_at
CREATE TRIGGER update_work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
