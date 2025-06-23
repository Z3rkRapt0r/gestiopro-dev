
-- Aggiungi policy per permettere agli admin di creare trasferte per altri utenti
CREATE POLICY "Admins can create business trips for others" 
  ON public.business_trips 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Assicurati che gli utenti possano creare le proprie trasferte
DROP POLICY IF EXISTS "Users can create their own business trips" ON public.business_trips;
CREATE POLICY "Users can create their own business trips" 
  ON public.business_trips 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
