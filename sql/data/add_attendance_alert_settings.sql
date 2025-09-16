-- Aggiungi colonne per il controllo automatico delle entrate alla tabella admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS attendance_alert_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attendance_alert_delay_minutes INTEGER DEFAULT 30;

-- Aggiorna il constraint per includere il nuovo tipo di template 'avviso-entrata'
ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS check_template_type;

ALTER TABLE public.email_templates 
ADD CONSTRAINT check_template_type 
CHECK (template_type IN (
  'documenti', 
  'notifiche', 
  'approvazioni', 
  'generale', 
  'permessi-richiesta', 
  'permessi-approvazione', 
  'permessi-rifiuto',
  'ferie-richiesta',
  'ferie-approvazione', 
  'ferie-rifiuto',
  'avviso-entrata'
));

-- Aggiorna i valori di default per admin esistenti
UPDATE public.admin_settings 
SET 
  attendance_alert_enabled = COALESCE(attendance_alert_enabled, false),
  attendance_alert_delay_minutes = COALESCE(attendance_alert_delay_minutes, 30)
WHERE attendance_alert_enabled IS NULL 
   OR attendance_alert_delay_minutes IS NULL;

-- Tabella per tracciare gli avvisi di entrata mancante inviati
CREATE TABLE IF NOT EXISTS public.attendance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_date DATE NOT NULL,
  alert_time TIME NOT NULL,
  expected_time TIME NOT NULL,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Un avviso per dipendente per giorno
  UNIQUE(employee_id, alert_date)
);

-- Assicurati che la colonna email_sent_at esista
ALTER TABLE public.attendance_alerts 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE;

-- Abilita RLS
ALTER TABLE public.attendance_alerts ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli admin di vedere tutti gli avvisi
CREATE POLICY "Admins can view all attendance alerts" 
  ON public.attendance_alerts 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per permettere alla funzione di inserire avvisi
CREATE POLICY "System can insert attendance alerts" 
  ON public.attendance_alerts 
  FOR INSERT 
  WITH CHECK (true);

-- Indice per performance
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_date ON public.attendance_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_employee ON public.attendance_alerts(employee_id);
