-- Fix per aggiungere la colonna email_sent_at alla tabella attendance_alerts
-- Esegui questo script nel Supabase SQL Editor

-- Assicurati che la colonna email_sent_at esista
ALTER TABLE public.attendance_alerts 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE;

-- Verifica che la colonna sia stata aggiunta
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'attendance_alerts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

