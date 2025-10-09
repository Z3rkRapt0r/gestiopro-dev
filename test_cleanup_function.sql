-- 1. Verifica quante notifiche ci sono
SELECT 'notifications' as table_name, COUNT(*) as count FROM notifications
UNION ALL
SELECT 'sent_notifications' as table_name, COUNT(*) as count FROM sent_notifications;

-- 2. Verifica se la funzione cleanup_all_records esiste
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%cleanup%';

-- 3. Test della funzione cleanup_all_records (questo NON elimina, solo conta)
-- Verifica manualmente il contenuto
SELECT * FROM public.cleanup_all_records('notifications');

-- 4. Verifica permessi sulla funzione
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'cleanup_all_records'
  AND routine_schema = 'public';

