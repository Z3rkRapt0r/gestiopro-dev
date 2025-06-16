
-- Crea una tabella dedicata per la cronologia delle notifiche inviate dall'admin
CREATE TABLE public.sent_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  recipient_id UUID NULL, -- NULL per "tutti i dipendenti"
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  body TEXT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  attachment_url TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.sent_notifications ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli admin di vedere solo le proprie notifiche inviate
CREATE POLICY "Admin can view own sent notifications" ON public.sent_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) AND admin_id = auth.uid()
  );

-- Policy per permettere agli admin di inserire notifiche inviate
CREATE POLICY "Admin can insert sent notifications" ON public.sent_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) AND admin_id = auth.uid()
  );

-- Trigger per aggiornare updated_at
CREATE TRIGGER handle_updated_at_sent_notifications
  BEFORE UPDATE ON public.sent_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
