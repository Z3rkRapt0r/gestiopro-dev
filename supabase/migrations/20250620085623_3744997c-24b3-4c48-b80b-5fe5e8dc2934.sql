
-- Crea la tabella per le presenze dei dipendenti
CREATE TABLE public.attendances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  check_in_latitude double precision,
  check_in_longitude double precision,
  check_out_latitude double precision,
  check_out_longitude double precision,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Abilita RLS per le presenze
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- Policy per permettere ai dipendenti di vedere solo le proprie presenze
CREATE POLICY "Users can view their own attendances" 
  ON public.attendances 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy per permettere ai dipendenti di inserire le proprie presenze
CREATE POLICY "Users can create their own attendances" 
  ON public.attendances 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy per permettere ai dipendenti di aggiornare le proprie presenze
CREATE POLICY "Users can update their own attendances" 
  ON public.attendances 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy per permettere agli admin di vedere tutte le presenze
CREATE POLICY "Admins can view all attendances" 
  ON public.attendances 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger per aggiornare updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.attendances 
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
