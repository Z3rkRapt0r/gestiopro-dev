
-- Crea tabella per il conteggio dei giorni lavorativi
CREATE TABLE public.working_days_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  should_be_tracked BOOLEAN NOT NULL DEFAULT true,
  tracking_reason TEXT, -- 'hire_date', 'year_start', 'manual_override'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint per evitare duplicati
  UNIQUE(user_id, date)
);

-- Abilita RLS
ALTER TABLE public.working_days_tracking ENABLE ROW LEVEL SECURITY;

-- Policy per admin (possono vedere tutto)
CREATE POLICY "Admins can manage all working days tracking" 
  ON public.working_days_tracking 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per dipendenti (possono vedere solo i propri)
CREATE POLICY "Users can view their own working days tracking" 
  ON public.working_days_tracking 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION public.update_working_days_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER working_days_tracking_updated_at
  BEFORE UPDATE ON public.working_days_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_working_days_tracking_updated_at();

-- Funzione per popolare automaticamente i giorni lavorativi basandosi sul tracking_start_type
CREATE OR REPLACE FUNCTION public.populate_working_days_for_user(
  target_user_id UUID,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT CURRENT_DATE + INTERVAL '1 year'
)
RETURNS INTEGER AS $$
DECLARE
  user_profile RECORD;
  work_date DATE;
  days_inserted INTEGER := 0;
BEGIN
  -- Ottieni il profilo dell'utente
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utente non trovato: %', target_user_id;
  END IF;
  
  -- Determina la data di inizio
  IF start_date IS NULL THEN
    IF user_profile.tracking_start_type = 'from_hire_date' AND user_profile.hire_date IS NOT NULL THEN
      work_date := user_profile.hire_date;
    ELSE
      work_date := DATE_TRUNC('year', CURRENT_DATE)::DATE; -- 1° gennaio dell'anno corrente
    END IF;
  ELSE
    work_date := start_date;
  END IF;
  
  -- Per dipendenti esistenti (from_year_start), inizia dal 1° gennaio
  IF user_profile.tracking_start_type = 'from_year_start' THEN
    work_date := DATE_TRUNC('year', CURRENT_DATE)::DATE;
  END IF;
  
  -- Popola i giorni lavorativi
  WHILE work_date <= end_date LOOP
    -- Inserisci solo se non esiste già
    INSERT INTO public.working_days_tracking (
      user_id,
      date,
      should_be_tracked,
      tracking_reason
    )
    VALUES (
      target_user_id,
      work_date,
      true,
      CASE 
        WHEN user_profile.tracking_start_type = 'from_hire_date' THEN 'hire_date'
        ELSE 'year_start'
      END
    )
    ON CONFLICT (user_id, date) DO NOTHING;
    
    -- Se l'inserimento è andato a buon fine, incrementa il contatore
    IF FOUND THEN
      days_inserted := days_inserted + 1;
    END IF;
    
    work_date := work_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN days_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per controllare se un dipendente dovrebbe essere tracciato in una specifica data
CREATE OR REPLACE FUNCTION public.should_track_employee_on_date(
  target_user_id UUID,
  check_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  tracking_record RECORD;
  user_profile RECORD;
BEGIN
  -- Prima controlla se esiste già un record specifico
  SELECT * INTO tracking_record
  FROM public.working_days_tracking
  WHERE user_id = target_user_id AND date = check_date;
  
  IF FOUND THEN
    RETURN tracking_record.should_be_tracked;
  END IF;
  
  -- Se non esiste, calcola basandosi sul profilo
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Logica basata sul tracking_start_type
  IF user_profile.tracking_start_type = 'from_hire_date' THEN
    -- Solo se la data è >= data di assunzione
    RETURN user_profile.hire_date IS NOT NULL AND check_date >= user_profile.hire_date;
  ELSE
    -- from_year_start: traccia sempre (saranno assenti fino al caricamento manuale)
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Popola automaticamente per tutti gli utenti esistenti
INSERT INTO public.working_days_tracking (user_id, date, should_be_tracked, tracking_reason)
SELECT 
  p.id,
  generate_series(
    CASE 
      WHEN p.tracking_start_type = 'from_hire_date' AND p.hire_date IS NOT NULL 
      THEN p.hire_date
      ELSE DATE_TRUNC('year', CURRENT_DATE)::DATE
    END,
    CURRENT_DATE + INTERVAL '1 year',
    '1 day'::interval
  )::DATE as date,
  true,
  CASE 
    WHEN p.tracking_start_type = 'from_hire_date' THEN 'hire_date'
    ELSE 'year_start'
  END
FROM public.profiles p
WHERE p.is_active = true
ON CONFLICT (user_id, date) DO NOTHING;
