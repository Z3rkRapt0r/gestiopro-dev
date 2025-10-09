-- Verifica la configurazione della pulizia
SELECT * FROM public.cleanup_config ORDER BY table_name;

-- Verifica quante notifiche ci sono
SELECT 'notifications' as table_name, COUNT(*) as count FROM notifications
UNION ALL
SELECT 'sent_notifications' as table_name, COUNT(*) as count FROM sent_notifications;

