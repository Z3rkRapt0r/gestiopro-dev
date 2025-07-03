-- Crea la tabella dedicata per le malattie
CREATE TABLE public.sick_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Vincoli per integrità
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT unique_user_date_range UNIQUE (user_id, start_date, end_date)
);

-- Abilita RLS
ALTER TABLE public.sick_leaves ENABLE ROW LEVEL SECURITY;

-- Politiche RLS per amministratori
CREATE POLICY "Admins can manage all sick leaves"
ON public.sick_leaves
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Politiche RLS per dipendenti (solo visualizzazione proprie malattie)
CREATE POLICY "Users can view their own sick leaves"
ON public.sick_leaves
FOR SELECT
USING (user_id = auth.uid());

-- Trigger per aggiornamento automatico updated_at
CREATE OR REPLACE FUNCTION public.update_sick_leaves_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sick_leaves_updated_at
  BEFORE UPDATE ON public.sick_leaves
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sick_leaves_updated_at();

-- Funzione di verifica integrità date
CREATE OR REPLACE FUNCTION public.verify_sick_leave_dates(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSONB AS $$
DECLARE
  expected_days INTEGER;
  actual_days INTEGER;
  date_list DATE[];
  loop_date DATE;
  result JSONB;
BEGIN
  -- Calcola i giorni attesi
  expected_days := (p_end_date - p_start_date) + 1;
  
  -- Genera l'array delle date attese
  loop_date := p_start_date;
  WHILE loop_date <= p_end_date LOOP
    date_list := array_append(date_list, loop_date);
    loop_date := loop_date + INTERVAL '1 day';
  END LOOP;
  
  actual_days := array_length(date_list, 1);
  
  -- Costruisce il risultato
  result := jsonb_build_object(
    'user_id', p_user_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'expected_days', expected_days,
    'actual_days', actual_days,
    'date_list', to_jsonb(date_list),
    'is_valid', (expected_days = actual_days),
    'verified_at', now()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per controllare sovrapposizioni
CREATE OR REPLACE FUNCTION public.check_sick_leave_overlaps(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  overlapping_records RECORD;
  has_overlaps BOOLEAN := FALSE;
  overlap_details JSONB := '[]'::JSONB;
BEGIN
  -- Cerca sovrapposizioni esistenti
  FOR overlapping_records IN 
    SELECT id, start_date, end_date, notes
    FROM public.sick_leaves
    WHERE user_id = p_user_id
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND (
        (start_date <= p_end_date AND end_date >= p_start_date)
      )
  LOOP
    has_overlaps := TRUE;
    overlap_details := overlap_details || jsonb_build_object(
      'id', overlapping_records.id,
      'start_date', overlapping_records.start_date,
      'end_date', overlapping_records.end_date,
      'notes', overlapping_records.notes
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'has_overlaps', has_overlaps,
    'overlapping_periods', overlap_details,
    'checked_period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;