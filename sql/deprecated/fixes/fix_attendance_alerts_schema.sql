-- =========================================
-- 🔧 CORREZIONE SCHEMA TABELLA ATTENDANCE_ALERTS
-- =========================================

-- Verifica se la tabella esiste e quali colonne ha
SELECT '🔍 Verifica tabella attendance_alerts esistente:' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'attendance_alerts' 
ORDER BY ordinal_position;

-- Se la tabella non esiste, creala con lo schema corretto
CREATE TABLE IF NOT EXISTS public.attendance_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES admin_settings(id) ON DELETE CASCADE,
    alert_date DATE NOT NULL,
    alert_time TIME NOT NULL,
    expected_time TIME NOT NULL,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggiungi colonne mancanti se necessario
ALTER TABLE public.attendance_alerts 
ADD COLUMN IF NOT EXISTS expected_time TIME;

ALTER TABLE public.attendance_alerts 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

ALTER TABLE public.attendance_alerts 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.attendance_alerts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Assicurati che gli indici esistano
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_employee_date 
ON public.attendance_alerts(employee_id, alert_date);

CREATE INDEX IF NOT EXISTS idx_attendance_alerts_admin_date 
ON public.attendance_alerts(admin_id, alert_date);

CREATE INDEX IF NOT EXISTS idx_attendance_alerts_email_sent 
ON public.attendance_alerts(email_sent_at) WHERE email_sent_at IS NULL;

-- Verifica schema finale
SELECT '✅ Schema tabella dopo correzione:' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'attendance_alerts' 
ORDER BY ordinal_position;

-- Abilita RLS se necessario
ALTER TABLE public.attendance_alerts ENABLE ROW LEVEL SECURITY;

-- Policy per permettere l'accesso agli amministratori
DROP POLICY IF EXISTS "Admins can manage attendance alerts" ON public.attendance_alerts;
CREATE POLICY "Admins can manage attendance alerts" ON public.attendance_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy per permettere ai dipendenti di vedere i propri avvisi
DROP POLICY IF EXISTS "Employees can view their own alerts" ON public.attendance_alerts;
CREATE POLICY "Employees can view their own alerts" ON public.attendance_alerts
    FOR SELECT USING (employee_id = auth.uid());

-- Test: inserisci un record di test se la tabella è vuota
INSERT INTO public.attendance_alerts (employee_id, admin_id, alert_date, alert_time, expected_time)
SELECT 
    p.id as employee_id,
    a.id as admin_id,
    CURRENT_DATE as alert_date,
    CURRENT_TIME as alert_time,
    '09:00:00'::TIME as expected_time
FROM profiles p
CROSS JOIN admin_settings a
WHERE p.role = 'employee' AND p.is_active = true
AND a.attendance_alert_enabled = true
LIMIT 1
ON CONFLICT DO NOTHING;

-- Verifica che l'inserimento sia andato bene
SELECT '🧪 Test inserimento:' as status, COUNT(*) as records_in_table
FROM public.attendance_alerts;

-- Se abbiamo creato un record di test, rimuovilo
DELETE FROM public.attendance_alerts 
WHERE alert_date = CURRENT_DATE 
AND expected_time = '09:00:00'::TIME;
