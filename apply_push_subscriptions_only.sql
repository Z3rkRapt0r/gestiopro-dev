-- ============================================================================
-- MIGRATION: Push Notifications Subscriptions Table ONLY
-- ============================================================================
-- Applica solo la migration per push notifications
-- ============================================================================

-- Crea la tabella push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_endpoint text NOT NULL UNIQUE,
    subscription_keys jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
ON public.push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
ON public.push_subscriptions(subscription_endpoint);

-- RLS Policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop policies se esistono
DROP POLICY IF EXISTS "Users can read own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Admins can read all push subscriptions" ON public.push_subscriptions;

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

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;

CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_push_subscriptions_updated_at();

-- ============================================================================
-- VERIFICA
-- ============================================================================

SELECT '✅ Tabella push_subscriptions creata con successo' as risultato;

SELECT
    'Colonne:' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'push_subscriptions'
ORDER BY ordinal_position;

SELECT
    'Policies:' as info,
    policyname
FROM pg_policies
WHERE tablename = 'push_subscriptions';
