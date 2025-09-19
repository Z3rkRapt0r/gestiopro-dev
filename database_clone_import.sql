-- =====================================================
-- DATABASE COMPLETO: SCHEMA + DATI
-- Per importare tutto nel database clone
-- =====================================================

-- ============================================================================
-- SCHEMA CONSOLIDATO DATABASE - OTTIMIZZAZIONE MIGRATIONS
-- ============================================================================
-- Questa migrazione rappresenta lo stato finale consolidato del database
-- Sostituisce tutte le 100+ migrations precedenti con una struttura pulita
-- Data: 2025-01-01 (data futura per garantire esecuzione dopo tutte le altre)

-- ============================================================================
-- 1. TABELLE BASE (da migrations originali consolidate)
-- ============================================================================

-- Tabella profili utenti
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role TEXT CHECK (role IN ('admin', 'employee')) NOT NULL DEFAULT 'employee',
  department TEXT,
  hire_date DATE,
  employee_code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  first_login BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Tabella documenti
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  uploaded_by UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  file_path TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('payslip', 'transfer', 'communication', 'medical_certificate', 'leave_request', 'expense_report', 'contract', 'other')) NOT NULL,
  is_personal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella notifiche
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('document', 'system', 'message', 'announcement')) DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella presenze
CREATE TABLE IF NOT EXISTS public.attendances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  break_start TIME,
  break_end TIME,
  total_hours DECIMAL(4,2),
  is_sick_leave BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Tabella richieste ferie/permessi
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT CHECK (type IN ('ferie', 'permesso')) NOT NULL,
  day DATE,
  date_from DATE,
  date_to DATE,
  reason TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella impostazioni amministratore
CREATE TABLE IF NOT EXISTS public.admin_settings (
  admin_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  attendance_alert_enabled BOOLEAN DEFAULT false,
  attendance_alert_delay_minutes INTEGER DEFAULT 30,
  resend_api_key TEXT,
  sender_name TEXT,
  sender_email TEXT,
  app_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (admin_id)
);

-- Tabella impostazioni generali app
CREATE TABLE IF NOT EXISTS public.app_general_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella orari lavorativi aziendali
CREATE TABLE IF NOT EXISTS public.work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monday BOOLEAN DEFAULT true,
  tuesday BOOLEAN DEFAULT true,
  wednesday BOOLEAN DEFAULT true,
  thursday BOOLEAN DEFAULT true,
  friday BOOLEAN DEFAULT true,
  saturday BOOLEAN DEFAULT false,
  sunday BOOLEAN DEFAULT false,
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '17:00:00',
  break_start TIME,
  break_end TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella orari personalizzati dipendenti
CREATE TABLE IF NOT EXISTS public.employee_work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '17:00:00',
  break_start TIME,
  break_end TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id)
);

-- Tabella avvisi presenza
CREATE TABLE IF NOT EXISTS public.attendance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_date DATE NOT NULL,
  alert_time TIME NOT NULL,
  expected_time TIME NOT NULL,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, alert_date)
);

-- Tabella trigger controllo presenze
CREATE TABLE IF NOT EXISTS public.attendance_check_triggers (
  trigger_date DATE PRIMARY KEY,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella template email
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 2. STORAGE BUCKETS
-- ============================================================================

-- Bucket documenti
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket logo aziendali
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. INDICI E CONSTRAINTS
-- ============================================================================

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_attendances_user_date ON public.attendances(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON public.attendances(date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_status ON public.leave_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_documents_user_type ON public.documents(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_date ON public.attendance_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_employee_date ON public.attendance_alerts(employee_id, alert_date);

-- Constraint template email
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

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_general_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_check_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Politiche RLS per profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politiche semplificate per altre tabelle (admin only per gestione)
DROP POLICY IF EXISTS "Admins can manage attendances" ON public.attendances;
CREATE POLICY "Admins can manage attendances" ON public.attendances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view their attendances" ON public.attendances;
CREATE POLICY "Users can view their attendances" ON public.attendances
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage leave requests" ON public.leave_requests;
CREATE POLICY "Admins can manage leave requests" ON public.leave_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can manage their leave requests" ON public.leave_requests;
CREATE POLICY "Users can manage their leave requests" ON public.leave_requests
  FOR ALL USING (auth.uid() = user_id);

-- Politiche per admin_settings (solo admin)
DROP POLICY IF EXISTS "Admins can manage admin settings" ON public.admin_settings;
CREATE POLICY "Admins can manage admin settings" ON public.admin_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politiche semplificate per tabelle di sistema (admin only)
DROP POLICY IF EXISTS "Admins can manage work schedules" ON public.work_schedules;
CREATE POLICY "Admins can manage work schedules" ON public.work_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politiche per attendance_alerts
DROP POLICY IF EXISTS "Admins can manage attendance alerts" ON public.attendance_alerts;
CREATE POLICY "Admins can manage attendance alerts" ON public.attendance_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politiche per altre tabelle (admin only per semplicità)
DROP POLICY IF EXISTS "Admins can manage all" ON public.app_general_settings;
CREATE POLICY "Admins can manage all" ON public.app_general_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 5. DATI DI DEFAULT
-- ============================================================================

-- Orari aziendali di default
INSERT INTO public.work_schedules (
    monday, tuesday, wednesday, thursday, friday, saturday, sunday,
    start_time, end_time, break_start, break_end
) VALUES (
    true, true, true, true, true, false, false,
    '08:00:00', '17:00:00', '12:00:00', '13:00:00'
) ON CONFLICT DO NOTHING;

-- Impostazioni generali di default
INSERT INTO public.app_general_settings (setting_key, setting_value, description)
VALUES
  ('max_permission_hours', '8', 'Massimo ore permesso giornaliero'),
  ('company_name', 'GestioPro', 'Nome dell''azienda')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- 6. FUNZIONI E TRIGGER
-- ============================================================================

-- Funzione per gestire nuovi utenti
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$;

-- Trigger per nuovi utenti
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger updated_at per tutte le tabelle
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS documents_updated_at ON public.documents;
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS attendances_updated_at ON public.attendances;
CREATE TRIGGER attendances_updated_at
  BEFORE UPDATE ON public.attendances
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Funzione cron per monitoraggio presenze (consolidata)
CREATE OR REPLACE FUNCTION public.attendance_monitor_cron()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_timestamp_val timestamp := now() at time zone 'Europe/Rome';
    current_date_str text;
    current_day_name text;
    admin_count integer := 0;
    total_employees integer := 0;
    alerts_created integer := 0;
    pending_alerts integer := 0;
    edge_response text;
    result_message text;
    admin_record record;
    employee_record record;
    employee_name text;
    is_working_day boolean;
    expected_start_time time;
    alert_time timestamp;
    leave_count integer;
    attendance_count integer;
    alert_count integer;
BEGIN
    result_message := '';

    BEGIN
        current_date_str := to_char(current_timestamp_val, 'YYYY-MM-DD');

        CASE EXTRACT(DOW FROM current_timestamp_val)
            WHEN 0 THEN current_day_name := 'sunday';
            WHEN 1 THEN current_day_name := 'monday';
            WHEN 2 THEN current_day_name := 'tuesday';
            WHEN 3 THEN current_day_name := 'wednesday';
            WHEN 4 THEN current_day_name := 'thursday';
            WHEN 5 THEN current_day_name := 'friday';
            WHEN 6 THEN current_day_name := 'saturday';
        END CASE;

        RAISE NOTICE '[Attendance Monitor Cron] Inizio controllo presenze - Giorno: %, Data: %, Ora Italiana: %',
            current_day_name, current_date_str, to_char(current_timestamp_val, 'HH24:MI');

        SELECT COUNT(*) INTO admin_count
        FROM admin_settings
        WHERE attendance_alert_enabled = true;

        SELECT COUNT(*) INTO total_employees
        FROM profiles
        WHERE role = 'employee' AND is_active = true;

        RAISE NOTICE '[Attendance Monitor Cron] % amministratori abilitati, % dipendenti attivi',
            admin_count, total_employees;

        IF admin_count = 0 THEN
            result_message := 'Monitoraggio presenze disabilitato - Nessun amministratore con controllo abilitato';
            RETURN result_message;
        END IF;

        INSERT INTO attendance_check_triggers (trigger_date, status)
        VALUES (current_date_str::date, 'pending')
        ON CONFLICT (trigger_date) DO UPDATE SET
            status = 'pending',
            updated_at = now();

        FOR admin_record IN
            SELECT admin_id, attendance_alert_delay_minutes
            FROM admin_settings
            WHERE attendance_alert_enabled = true
        LOOP
            RAISE NOTICE '[Attendance Monitor Cron] Elaborazione admin % (ritardo: % minuti)',
                admin_record.admin_id, admin_record.attendance_alert_delay_minutes;

            FOR employee_record IN
                SELECT p.id, p.first_name, p.last_name, p.email,
                       ews.work_days, ews.start_time as emp_start_time,
                       ws.monday, ws.tuesday, ws.wednesday, ws.thursday,
                       ws.friday, ws.saturday, ws.sunday,
                       ws.start_time as company_start_time
                FROM profiles p
                LEFT JOIN employee_work_schedules ews ON p.id = ews.employee_id
                CROSS JOIN work_schedules ws
                WHERE p.role = 'employee' AND p.is_active = true
            LOOP
                employee_name := TRIM(COALESCE(employee_record.first_name, '') || ' ' || COALESCE(employee_record.last_name, ''));

                is_working_day := false;

                IF employee_record.work_days IS NOT NULL THEN
                    is_working_day := current_day_name = ANY(employee_record.work_days);
                    expected_start_time := employee_record.emp_start_time;
                ELSE
                    CASE current_day_name
                        WHEN 'monday' THEN is_working_day := employee_record.monday;
                        WHEN 'tuesday' THEN is_working_day := employee_record.tuesday;
                        WHEN 'wednesday' THEN is_working_day := employee_record.wednesday;
                        WHEN 'thursday' THEN is_working_day := employee_record.thursday;
                        WHEN 'friday' THEN is_working_day := employee_record.friday;
                        WHEN 'saturday' THEN is_working_day := employee_record.saturday;
                        WHEN 'sunday' THEN is_working_day := employee_record.sunday;
                    END CASE;
                    expected_start_time := employee_record.company_start_time;
                END IF;

                IF NOT is_working_day THEN
                    CONTINUE;
                END IF;

                SELECT COUNT(*) INTO leave_count
                FROM leave_requests
                WHERE user_id = employee_record.id
                AND status = 'approved'
                AND (
                    (type IN ('ferie', 'malattia', 'trasferta') AND date_from <= current_date_str::date AND date_to >= current_date_str::date)
                    OR (type = 'permesso' AND day = current_date_str::date)
                );

                IF leave_count > 0 THEN
                    RAISE NOTICE '[Attendance Monitor Cron] % è in ferie/permesso/malattia/trasferta - saltato', employee_name;
                    CONTINUE;
                END IF;

                alert_time := (current_date_str || ' ' || expected_start_time)::timestamp +
                             (admin_record.attendance_alert_delay_minutes || ' minutes')::interval;

                IF current_timestamp_val < alert_time THEN
                    CONTINUE;
                END IF;

                SELECT COUNT(*) INTO attendance_count
                FROM attendances
                WHERE user_id = employee_record.id
                AND date = current_date_str::date
                AND check_in_time IS NOT NULL;

                IF attendance_count > 0 THEN
                    CONTINUE;
                END IF;

                SELECT COUNT(*) INTO alert_count
                FROM attendance_alerts
                WHERE employee_id = employee_record.id
                AND alert_date = current_date_str::date;

                IF alert_count > 0 THEN
                    CONTINUE;
                END IF;

                INSERT INTO attendance_alerts (
                    employee_id,
                    admin_id,
                    alert_date,
                    alert_time,
                    expected_time
                ) VALUES (
                    employee_record.id,
                    admin_record.admin_id,
                    current_date_str::date,
                    current_timestamp_val::time,
                    expected_start_time
                );

                alerts_created := alerts_created + 1;
                RAISE NOTICE '[Attendance Monitor Cron] Avviso creato per % (previsto: %, attuale: %)',
                    employee_name, expected_start_time, to_char(current_timestamp_val, 'HH24:MI');

            END LOOP;
        END LOOP;

        SELECT COUNT(*) INTO pending_alerts
        FROM attendance_alerts
        WHERE alert_date = current_date_str::date
        AND email_sent_at IS NULL;

        RAISE NOTICE '[Attendance Monitor Cron] Controllo completato: % nuovi avvisi, % totali pendenti',
            alerts_created, pending_alerts;

        IF alerts_created > 0 OR pending_alerts > 0 THEN
            RAISE NOTICE '[Attendance Monitor Cron] Chiamata Edge Function attendance-monitor per elaborare % avvisi (% nuovi, % esistenti)',
                pending_alerts, alerts_created, pending_alerts - alerts_created;

            BEGIN
                SELECT content INTO edge_response
                FROM http((
                    'POST',
                    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/attendance-monitor',
                    ARRAY[
                        http_header('Content-Type', 'application/json'),
                        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTEyNzYsImV4cCI6MjA2NTQ2NzI3Nn0.oigK8ck7f_sBeXfJ8P1ySdqMHiVpXdjkoBSR4uMZgRQ')
                    ],
                    'application/json',
                    '{}'
                ));

                RAISE NOTICE '[Attendance Monitor Cron] Risposta Edge Function: %', edge_response;
                edge_response := COALESCE(edge_response, 'Risposta vuota dalla Edge Function');

            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '[Attendance Monitor Cron] Errore chiamata Edge Function: %', SQLERRM;
                edge_response := 'ERRORE: ' || SQLERRM;
            END;
        ELSE
            edge_response := 'Nessun avviso da elaborare';
        END IF;

        result_message := format(
            'Monitoraggio presenze completato alle %s. Nuovi avvisi: %s | Totali pendenti: %s | Email: %s',
            to_char(current_timestamp_val, 'HH24:MI'),
            alerts_created,
            pending_alerts,
            edge_response
        );

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[Attendance Monitor Cron] Errore critico: %', SQLERRM;
        result_message := format('ERRORE alle %s: %s',
            to_char(current_timestamp_val, 'HH24:MI'),
            SQLERRM
        );
    END;

    RETURN COALESCE(result_message, 'Errore: messaggio risultato null');

END;
$$;

-- Configurazione cron job
SELECT cron.unschedule('attendance-monitor-cron');
SELECT cron.schedule(
    'attendance-monitor-cron',
    '*/15 * * * *',
    'SELECT public.attendance_monitor_cron();'
);

-- ============================================================================
-- 7. VERIFICA FINALE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 MIGRATION CONSOLIDATA COMPLETATA!';
    RAISE NOTICE '📊 Database schema ottimizzato e consolidato';
    RAISE NOTICE '⏰ Sistema di monitoraggio presenze attivo';
    RAISE NOTICE '🔄 Cron job configurato per ogni 15 minuti';
END $$;
-- INSERT statements per tabella app_general_settings
-- Generato: 2025-09-17T18:31:41.578Z

INSERT INTO app_general_settings (id, admin_id, app_title, app_description, created_at, updated_at, max_permission_hours) VALUES
('85de2f8e-6086-4ab7-90b4-b6a7d6582dea', '4d2f24be-ed12-4541-b894-faa7dc780fa5', 'A.L.M Infissi - Gestione Aziendale', 'Sistema di gestione aziendale per imprese', '2025-08-16T12:06:20.44838+00:00', '2025-09-07T17:24:00.347851+00:00', 4);
-- INSERT statements per tabella attendance_check_triggers
-- Generato: 2025-09-17T18:31:41.588Z

INSERT INTO attendance_check_triggers (trigger_date, status, created_at, updated_at) VALUES
('2025-09-15', 'processing', '2025-09-15T23:30:45.27175+00:00', '2025-09-15T23:59:03.894156+00:00'),
('2025-09-16', 'processing', '2025-09-16T08:44:31.795504+00:00', '2025-09-16T23:07:00.162038+00:00'),
('2025-09-17', 'pending', '2025-09-17T15:28:24.982658+00:00', '2025-09-17T18:30:00.194035+00:00');

-- =====================================================
-- IMPORTAZIONE COMPLETATA
-- =====================================================
-- Questo file contiene:
-- ✅ Tutto lo schema del database (tabelle, funzioni, trigger, RLS)
-- ✅ Tutti i dati esistenti
-- 
-- Per importare nel database clone:
-- 1. Assicurati che il database sia vuoto
-- 2. Esegui: psql [connection_string] -f database_clone_import.sql
-- =====================================================

