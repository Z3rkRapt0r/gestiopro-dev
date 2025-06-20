
-- Policy per business_trips - permettere agli admin di vedere tutte le trasferte
CREATE POLICY "Admins can view all business trips" 
  ON public.business_trips 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per business_trips - permettere agli admin di aggiornare tutte le trasferte
CREATE POLICY "Admins can update all business trips" 
  ON public.business_trips 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per manual_attendances - permettere la lettura a tutti gli utenti delle proprie presenze
CREATE POLICY "Users can view manual attendances" 
  ON public.manual_attendances 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per attendances - permettere agli admin di inserire presenze manuali per altri utenti
CREATE POLICY "Admins can create attendances for others" 
  ON public.attendances 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per attendances - permettere agli admin di aggiornare tutte le presenze
CREATE POLICY "Admins can update all attendances" 
  ON public.attendances 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
