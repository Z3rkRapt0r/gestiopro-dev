-- ============================================================================
-- DEBUG: Perché la funzione cleanup non elimina i record?
-- ============================================================================

-- 1. Verifica RLS sulle tabelle
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('notifications', 'sent_notifications');

-- 2. Verifica le policy RLS attive
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('notifications', 'sent_notifications');

-- 3. Verifica i trigger sulle tabelle
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('notifications', 'sent_notifications');

-- 4. Verifica foreign keys
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('notifications', 'sent_notifications');

-- 5. TEST DIRETTO: Prova a eliminare UN SOLO record manualmente
-- (decommenta per testare)
-- DELETE FROM sent_notifications WHERE id IN (SELECT id FROM sent_notifications LIMIT 1);

-- 6. Verifica permessi dell'utente corrente
SELECT current_user, current_role;

-- ============================================================================
-- DOPO AVER VISTO I RISULTATI, esegui questo per DISABILITARE RLS temporaneamente:
-- ============================================================================
-- ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sent_notifications DISABLE ROW LEVEL SECURITY;

