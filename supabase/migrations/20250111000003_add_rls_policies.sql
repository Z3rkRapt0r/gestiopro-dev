-- Aggiunge policy RLS per le tabelle che hanno RLS abilitato ma senza policy
-- Questo risolve i suggerimenti di Security Advisor

-- ============================================
-- Policy per app_config (configurazioni app)
-- ============================================

-- Admin può fare tutto su app_config
CREATE POLICY "Admin can manage app_config"
ON public.app_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Tutti gli utenti autenticati possono leggere app_config
CREATE POLICY "Authenticated users can read app_config"
ON public.app_config
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- Policy per cleanup_config
-- ============================================

-- Solo admin può gestire cleanup_config
CREATE POLICY "Admin can manage cleanup_config"
ON public.cleanup_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- Policy per edge_response (tabella di debug)
-- ============================================

-- Solo admin può vedere edge_response (per debugging)
CREATE POLICY "Admin can view edge_response"
ON public.edge_response
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Solo admin può inserire in edge_response
CREATE POLICY "Admin can insert edge_response"
ON public.edge_response
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Service role può fare tutto (per edge functions)
CREATE POLICY "Service role can manage edge_response"
ON public.edge_response
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Commenti
COMMENT ON POLICY "Admin can manage app_config" ON public.app_config IS 'Gli admin possono gestire tutte le configurazioni app';
COMMENT ON POLICY "Authenticated users can read app_config" ON public.app_config IS 'Tutti gli utenti autenticati possono leggere le configurazioni';
COMMENT ON POLICY "Admin can manage cleanup_config" ON public.cleanup_config IS 'Solo admin possono gestire cleanup_config';
COMMENT ON POLICY "Admin can view edge_response" ON public.edge_response IS 'Solo admin possono vedere edge_response per debugging';
COMMENT ON POLICY "Admin can insert edge_response" ON public.edge_response IS 'Solo admin possono inserire in edge_response';
COMMENT ON POLICY "Service role can manage edge_response" ON public.edge_response IS 'Service role (edge functions) possono gestire edge_response';
