
-- Permetti agli utenti di eliminare SOLO le proprie richieste di ferie/permesso
CREATE POLICY "users can delete their own leave requests"
  ON public.leave_requests
  FOR DELETE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
