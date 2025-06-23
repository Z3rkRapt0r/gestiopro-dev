
-- ATTENZIONE: Questa operazione elimina TUTTI i dati utente dal sistema
-- Non sarà possibile recuperare i dati dopo l'esecuzione

-- Disabilita temporaneamente i trigger per evitare conflitti
SET session_replication_role = replica;

-- Elimina tutti i dati dalle tabelle utente (ordine importante per rispettare le foreign key)
DELETE FROM sent_notifications;
DELETE FROM notifications;
DELETE FROM messages;
DELETE FROM employee_leave_balance;
DELETE FROM leave_requests;
DELETE FROM business_trips;
DELETE FROM manual_attendances;
DELETE FROM unified_attendances;
DELETE FROM attendances;
DELETE FROM documents;
DELETE FROM email_templates;
DELETE FROM employee_logo_settings;
DELETE FROM dashboard_settings;
DELETE FROM login_settings;
DELETE FROM admin_settings;

-- Elimina i profili utente (questo rimuoverà anche i riferimenti agli utenti)
DELETE FROM profiles;

-- Riabilita i trigger
SET session_replication_role = DEFAULT;

-- Reset delle sequenze se necessario
-- (Le tabelle usano UUID quindi non ci sono sequenze da resettare)

-- Verifica che le tabelle siano vuote
SELECT 'profiles' as tabella, COUNT(*) as record_rimanenti FROM profiles
UNION ALL
SELECT 'documents', COUNT(*) FROM documents
UNION ALL
SELECT 'attendances', COUNT(*) FROM attendances
UNION ALL
SELECT 'employee_leave_balance', COUNT(*) FROM employee_leave_balance
UNION ALL
SELECT 'leave_requests', COUNT(*) FROM leave_requests
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'messages', COUNT(*) FROM messages;
