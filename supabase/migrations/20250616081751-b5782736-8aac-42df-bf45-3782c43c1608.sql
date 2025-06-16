
-- Aggiungi i campi mancanti alla tabella notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS body TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Abilita RLS sulla tabella notifications se non è già abilitato
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Rimuovi le policy esistenti se ci sono
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

-- Crea policy per permettere agli utenti di vedere le proprie notifiche
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Crea policy per permettere agli utenti di aggiornare le proprie notifiche (marcare come lette)
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Crea policy per permettere agli admin di inserire notifiche
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
