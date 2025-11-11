-- ============================================================================
-- MIGRATION: Push Notifications Subscriptions Table
-- ============================================================================
-- Crea la tabella per salvare le sottoscrizioni push degli utenti
-- ============================================================================

-- Crea la tabella push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_endpoint text NOT NULL UNIQUE,
    subscription_keys jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Constraints
    CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
ON public.push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
ON public.push_subscriptions(subscription_endpoint);

-- RLS Policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Gli utenti possono leggere solo le proprie sottoscrizioni
CREATE POLICY "Users can read own push subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Gli utenti possono inserire le proprie sottoscrizioni
CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Gli utenti possono aggiornare le proprie sottoscrizioni
CREATE POLICY "Users can update own push subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Gli utenti possono eliminare le proprie sottoscrizioni
CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Gli admin possono vedere tutte le sottoscrizioni
CREATE POLICY "Admins can read all push subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'administrator')
    )
);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_push_subscriptions_updated_at();

-- Commenti per documentazione
COMMENT ON TABLE public.push_subscriptions IS 'Sottoscrizioni push per le notifiche PWA';
COMMENT ON COLUMN public.push_subscriptions.user_id IS 'ID utente proprietario della sottoscrizione';
COMMENT ON COLUMN public.push_subscriptions.subscription_endpoint IS 'Endpoint univoco della sottoscrizione push';
COMMENT ON COLUMN public.push_subscriptions.subscription_keys IS 'Chiavi di crittografia per la sottoscrizione (p256dh, auth)';

-- ============================================================================
-- VERIFICA
-- ============================================================================

SELECT
    '✅ Tabella push_subscriptions creata' as risultato,
    COUNT(*) as numero_colonne
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'push_subscriptions';

SELECT
    '✅ RLS abilitato su push_subscriptions' as risultato,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'push_subscriptions';

SELECT
    '✅ Policy create per push_subscriptions' as risultato,
    COUNT(*) as numero_policies
FROM pg_policies
WHERE tablename = 'push_subscriptions';
