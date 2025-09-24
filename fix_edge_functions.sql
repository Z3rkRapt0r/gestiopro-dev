-- Script per verificare e correggere le Edge Functions

-- 1. Verifica se esiste la funzione clear_user_data
SELECT 
  'RPC FUNCTION CHECK' as test,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'clear_user_data';

-- 2. Crea la funzione clear_user_data se non esiste
CREATE OR REPLACE FUNCTION public.clear_user_data(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Elimina i dati dell'utente da tutte le tabelle correlate
  DELETE FROM public.attendances WHERE user_id = user_uuid;
  DELETE FROM public.leave_requests WHERE user_id = user_uuid;
  DELETE FROM public.documents WHERE user_id = user_uuid;
  DELETE FROM public.notifications WHERE user_id = user_uuid;
  DELETE FROM public.admin_settings WHERE admin_id = user_uuid;
  DELETE FROM public.employee_work_schedules WHERE user_id = user_uuid;
  DELETE FROM public.attendance_alerts WHERE user_id = user_uuid;
  DELETE FROM public.attendance_check_triggers WHERE user_id = user_uuid;
  
  -- Log dell'operazione
  RAISE NOTICE 'Dati eliminati per utente: %', user_uuid;
END;
$$;

-- 3. Verifica che la funzione sia stata creata
SELECT 
  'FUNCTION CREATED' as test,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'clear_user_data';

-- 4. Testa la funzione con un utente di test
-- (Sostituisci con un ID di test se necessario)
-- SELECT public.clear_user_data('test-user-id');

-- 5. Verifica le variabili d'ambiente per le Edge Functions
-- Controlla che SUPABASE_SERVICE_ROLE_KEY sia configurata su Vercel


