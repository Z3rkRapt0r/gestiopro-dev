-- Fix: Assicura che i record di configurazione esistano
-- Da eseguire manualmente se la migration non ha inserito i dati

-- Elimina eventuali configurazioni esistenti e ricrea
DELETE FROM public.cleanup_config WHERE table_name IN ('notifications', 'sent_notifications');

-- Inserisci le configurazioni
INSERT INTO public.cleanup_config (table_name, retention_days, is_enabled, last_cleanup_at, last_cleaned_count)
VALUES 
  ('notifications', 30, TRUE, NULL, 0),
  ('sent_notifications', 90, TRUE, NULL, 0);

-- Verifica
SELECT * FROM public.cleanup_config ORDER BY table_name;

-- Test della funzione (dry run)
SELECT * FROM public.cleanup_all_records('notifications');
SELECT * FROM public.cleanup_all_records('sent_notifications');

