-- Migrazione dati esistenti da unified_attendances
-- Prima consolidiamo i giorni consecutivi di malattia in periodi
WITH sick_periods AS (
  SELECT 
    user_id,
    MIN(date) as start_date,
    MAX(date) as end_date,
    STRING_AGG(DISTINCT COALESCE(notes, 'Migrato da unified_attendances'), ' | ') as consolidated_notes,
    (array_agg(created_by ORDER BY created_at ASC))[1] as created_by,
    MIN(created_at) as created_at,
    -- Raggruppa giorni consecutivi usando window functions
    date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY date))::INTEGER * INTERVAL '1 day' as period_group
  FROM public.unified_attendances
  WHERE is_sick_leave = true
  GROUP BY user_id, period_group
)
INSERT INTO public.sick_leaves (user_id, start_date, end_date, notes, created_by, created_at)
SELECT 
  user_id,
  start_date,
  end_date,
  consolidated_notes,
  created_by,
  created_at
FROM sick_periods
ORDER BY user_id, start_date;

-- Rimuovi i record di malattia da unified_attendances (ora nella tabella dedicata)
DELETE FROM public.unified_attendances WHERE is_sick_leave = true;