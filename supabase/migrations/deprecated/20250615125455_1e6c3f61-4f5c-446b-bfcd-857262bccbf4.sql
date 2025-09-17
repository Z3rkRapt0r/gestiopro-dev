
-- 1. Crea la tabella per le richieste di ferie e permesso
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('permesso', 'ferie')),
  -- Per i permessi (un giorno, con fasce orarie)
  day DATE,
  time_from TIME,
  time_to TIME,
  -- Per le ferie (intervallo di date)
  date_from DATE,
  date_to DATE,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Row Level Security: Abilita RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- 3. Policy: L'utente vede SOLO le proprie richieste
CREATE POLICY "users can view their own leave requests"
  ON public.leave_requests
  FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Policy: L'utente può inserire SOLO per sé stesso
CREATE POLICY "users can insert their own leave requests"
  ON public.leave_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 5. Policy: Admin può modificare lo stato, utente non può modificare dopo invio
CREATE POLICY "admin can update status"
  ON public.leave_requests
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Policy: Utente può leggere solo le proprie richieste, admin tutte
CREATE POLICY "admin can select all"
  ON public.leave_requests
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 7. Policy: Admin può inserire/aggiornare per motivi di gestione
CREATE POLICY "admin can insert"
  ON public.leave_requests
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin can update"
  ON public.leave_requests
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
