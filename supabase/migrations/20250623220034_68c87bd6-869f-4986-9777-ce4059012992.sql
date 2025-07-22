
-- Prima rimuoviamo la policy esistente se esiste
DROP POLICY IF EXISTS "Admins can delete all business trips" ON public.business_trips;

-- Creiamo una funzione security definer per verificare se l'utente è admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Ricreiamo la policy usando la funzione
CREATE POLICY "Admins can delete all business trips" 
  ON public.business_trips 
  FOR DELETE 
  USING (public.is_admin());

-- Assicuriamoci che anche la policy di lettura usi la stessa funzione
DROP POLICY IF EXISTS "Admins can view all business trips" ON public.business_trips;
CREATE POLICY "Admins can view all business trips" 
  ON public.business_trips 
  FOR SELECT 
  USING (public.is_admin());
