
-- Permetti ai dipendenti di visualizzare sia le proprie notifiche che quelle generali
CREATE POLICY "Users can view own and global notifications" ON public.notifications
  FOR SELECT USING (
    user_id = auth.uid() OR user_id IS NULL
  );

-- Permetti all’admin di vedere tutte le notifiche da lui inviate (history invii)
CREATE POLICY "Admin can view sent notifications" ON public.notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) AND (created_by = auth.uid())
  );
