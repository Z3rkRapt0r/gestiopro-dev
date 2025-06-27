
-- Pulizia completa di tutti i dati operativi (mantenendo le impostazioni)
-- ATTENZIONE: Questa operazione eliminerà TUTTI i dati esistenti!

-- 1. Elimina tutte le richieste di ferie/permessi
DELETE FROM leave_requests;

-- 2. Elimina tutte le presenze unificate
DELETE FROM unified_attendances;

-- 3. Elimina tutte le presenze tradizionali
DELETE FROM attendances;

-- 4. Elimina tutte le presenze manuali
DELETE FROM manual_attendances;

-- 5. Elimina tutti i bilanci ferie dipendenti
DELETE FROM employee_leave_balance;

-- 6. Elimina tutte le notifiche
DELETE FROM notifications;

-- 7. Elimina tutte le notifiche inviate
DELETE FROM sent_notifications;

-- 8. Elimina tutti i viaggi di lavoro
DELETE FROM business_trips;

-- 9. Elimina tutti i messaggi
DELETE FROM messages;

-- 10. Reset delle sequenze per ricominciare con ID puliti
-- (Nota: Supabase usa UUID quindi non è necessario)

-- Verifica che le tabelle siano vuote
SELECT 
  'leave_requests' as tabella, COUNT(*) as record_rimanenti FROM leave_requests
UNION ALL
SELECT 'unified_attendances', COUNT(*) FROM unified_attendances
UNION ALL
SELECT 'attendances', COUNT(*) FROM attendances
UNION ALL
SELECT 'manual_attendances', COUNT(*) FROM manual_attendances
UNION ALL
SELECT 'employee_leave_balance', COUNT(*) FROM employee_leave_balance
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'sent_notifications', COUNT(*) FROM sent_notifications
UNION ALL
SELECT 'business_trips', COUNT(*) FROM business_trips
UNION ALL
SELECT 'messages', COUNT(*) FROM messages;
