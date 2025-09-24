-- Script per verificare le variabili d'ambiente delle Edge Functions

-- 1. Verifica che la funzione clear_user_data esista e funzioni
SELECT 
  'CLEAR_USER_DATA FUNCTION' as test,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'clear_user_data';

-- 2. Testa la funzione con un utente di test (se esiste)
-- SELECT public.clear_user_data('test-user-id');

-- 3. Verifica le tabelle che la funzione dovrebbe pulire
SELECT 
  'TABLES TO CLEAN' as test,
  table_name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'attendances',
  'leave_requests', 
  'documents',
  'notifications',
  'admin_settings',
  'employee_work_schedules',
  'attendance_alerts',
  'attendance_check_triggers'
)
ORDER BY table_name;

-- 4. Verifica i permessi per le operazioni di eliminazione
SELECT 
  'DELETE PERMISSIONS' as test,
  'CHECK MANUALLY' as status,
  'Verify that the service role has DELETE permissions on all tables' as note;



