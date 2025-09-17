
-- Policy per permettere agli admin di eliminare tutte le presenze
CREATE POLICY "Admins can delete all attendances" 
  ON public.attendances 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per permettere agli utenti di eliminare le proprie presenze (solo del giorno corrente)
CREATE POLICY "Users can delete their own today attendances" 
  ON public.attendances 
  FOR DELETE 
  USING (
    auth.uid() = user_id AND 
    date = CURRENT_DATE
  );
