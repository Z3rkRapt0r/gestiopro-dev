
-- Verifica e ricrea le politiche RLS per admin_settings
DROP POLICY IF EXISTS "Admins can view their setting" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can insert their setting" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update their setting" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can delete their setting" ON public.admin_settings;

-- Ricrea le politiche RLS corrette
CREATE POLICY "Admins can view their settings"
    ON public.admin_settings FOR SELECT
    USING (admin_id = auth.uid());

CREATE POLICY "Admins can insert their settings"
    ON public.admin_settings FOR INSERT
    WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can update their settings"
    ON public.admin_settings FOR UPDATE
    USING (admin_id = auth.uid())
    WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can delete their settings"
    ON public.admin_settings FOR DELETE
    USING (admin_id = auth.uid());
