
-- Creazione tabella messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),         -- Null quando messaggio collettivo
  is_global BOOLEAN NOT NULL DEFAULT false,         -- true: invio collettivo
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Abilita Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: un dipendente può leggere solo i messaggi destinati a sé o globali
CREATE POLICY "Read own or global messages"
  ON public.messages
  FOR SELECT
  USING (
    (recipient_id = auth.uid()) OR (is_global = TRUE)
  );

-- Policy: ogni utente può modificare solo il suo stato lettura
CREATE POLICY "Update read state"
  ON public.messages
  FOR UPDATE
  USING (
    (recipient_id = auth.uid())
  )
  WITH CHECK (
    (recipient_id = auth.uid())
  );

-- Policy: solo admin può inserire messaggi
CREATE POLICY "Only admin can insert"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Policy: solo admin può cancellare messaggi
CREATE POLICY "Only admin can delete"
  ON public.messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
