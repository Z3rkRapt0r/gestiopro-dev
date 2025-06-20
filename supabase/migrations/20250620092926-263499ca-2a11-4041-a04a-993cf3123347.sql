
-- Aggiungere colonne per le impostazioni dell'amministratore
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS checkout_enabled BOOLEAN DEFAULT true;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS company_latitude DOUBLE PRECISION;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS company_longitude DOUBLE PRECISION;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS attendance_radius_meters INTEGER DEFAULT 500;

-- Creare tabella per le trasferte
CREATE TABLE public.business_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  destination TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Creare tabella per le presenze manuali inserite dall'admin
CREATE TABLE public.manual_attendances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Aggiungere colonna per indicare se è una presenza in trasferta
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS is_business_trip BOOLEAN DEFAULT false;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS business_trip_id UUID REFERENCES business_trips(id);

-- Abilita RLS per le nuove tabelle
ALTER TABLE public.business_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_attendances ENABLE ROW LEVEL SECURITY;

-- Policy per business_trips - i dipendenti possono vedere solo le proprie
CREATE POLICY "Users can view their own business trips" 
  ON public.business_trips 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business trips" 
  ON public.business_trips 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending business trips" 
  ON public.business_trips 
  FOR UPDATE 
  USING (auth.uid() = user_id AND status = 'pending');

-- Policy per manual_attendances - solo admin possono gestirle
CREATE POLICY "Only admins can manage manual attendances" 
  ON public.manual_attendances 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Creare trigger per aggiornare updated_at
CREATE OR REPLACE TRIGGER handle_updated_at_business_trips
  BEFORE UPDATE ON public.business_trips
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE TRIGGER handle_updated_at_manual_attendances
  BEFORE UPDATE ON public.manual_attendances
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
