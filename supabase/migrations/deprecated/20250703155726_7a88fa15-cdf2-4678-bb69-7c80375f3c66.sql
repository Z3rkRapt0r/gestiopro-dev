-- Migrazione dati esistenti da unified_attendances
-- Semplice migrazione giorno per giorno
INSERT INTO public.sick_leaves (user_id, start_date, end_date, notes, created_by, created_at)
SELECT 
  user_id,
  date as start_date,
  date as end_date,
  COALESCE(notes, 'Migrato da unified_attendances') as notes,
  created_by,
  created_at
FROM public.unified_attendances
WHERE is_sick_leave = true
ORDER BY user_id, date;

-- Rimuovi i record di malattia da unified_attendances (ora nella tabella dedicata)
DELETE FROM public.unified_attendances WHERE is_sick_leave = true;