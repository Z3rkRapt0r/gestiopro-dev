
-- Policy per permettere agli admin di eliminare tutte le trasferte
CREATE POLICY "Admins can delete all business trips" 
  ON public.business_trips 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Verifica che esista già la policy per la lettura admin (se non esiste, la creiamo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'business_trips' 
    AND policyname = 'Admins can view all business trips'
  ) THEN
    CREATE POLICY "Admins can view all business trips" 
      ON public.business_trips 
      FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;
