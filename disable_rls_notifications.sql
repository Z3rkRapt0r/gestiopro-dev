-- ============================================================================
-- DISABLE RLS ON NOTIFICATIONS TABLES
-- ============================================================================
-- Questo script disabilita RLS sulle tabelle notifications e sent_notifications
-- per permettere alla Edge Function di eliminare i record
-- ============================================================================

-- 1. Verifica stato attuale RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrls
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('notifications', 'sent_notifications');

-- 2. Verifica policy RLS attive
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('notifications', 'sent_notifications');

-- 3. DISABILITA RLS sulle tabelle notifiche
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_notifications DISABLE ROW LEVEL SECURITY;

-- 4. Verifica che RLS sia disabilitato
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrls
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('notifications', 'sent_notifications');

-- 5. Test diretto (opzionale)
-- SELECT COUNT(*) FROM notifications;
-- SELECT COUNT(*) FROM sent_notifications;

-- ============================================================================
-- DOPO AVER ESEGUITO QUESTO SCRIPT:
-- 1. La Edge Function dovrebbe riuscire a eliminare i record
-- 2. Testa la pulizia dall'app
-- ============================================================================

-- ============================================================================
-- PER RIABILITARE RLS (se necessario in futuro):
-- ============================================================================
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sent_notifications ENABLE ROW LEVEL SECURITY;
