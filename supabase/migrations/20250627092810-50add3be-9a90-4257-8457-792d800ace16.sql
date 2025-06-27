
-- Insert a default work schedule record if the table is empty
INSERT INTO public.work_schedules (start_time, end_time, monday, tuesday, wednesday, thursday, friday, saturday, sunday, tolerance_minutes)
SELECT '08:00:00', '17:00:00', true, true, true, true, true, false, false, 15
WHERE NOT EXISTS (SELECT 1 FROM public.work_schedules);
