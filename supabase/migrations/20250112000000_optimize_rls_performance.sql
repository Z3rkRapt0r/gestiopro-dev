-- ============================================================================
-- OTTIMIZZAZIONE PERFORMANCE POLITICHE RLS
-- ============================================================================
-- Questa migration risolve i warning del Performance Advisor di Supabase:
-- 1. auth_rls_initplan: Sostituisce auth.uid() con (select auth.uid())
-- 2. multiple_permissive_policies: Consolida politiche duplicate
--
-- Data: 2025-01-12
-- Riferimento: https://supabase.com/docs/guides/database/postgres/row-level-security
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Verifica se l'utente è admin
-- ============================================================================
-- Questa funzione ottimizza le performance evitando subquery ripetute
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Verifica se l''utente corrente è un amministratore';

-- ============================================================================
-- PROFILES - Profili utente
-- ============================================================================

-- Rimuovi politiche esistenti
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to select their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own profile" ON public.profiles;

-- Crea politiche ottimizzate consolidate
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (
    id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK (
    id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  USING (
    id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE
  USING (
    id = (select auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- ATTENDANCES - Presenze
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage attendances" ON public.attendances;
DROP POLICY IF EXISTS "Admins can view all attendances" ON public.attendances;
DROP POLICY IF EXISTS "Admins can create attendances for others" ON public.attendances;
DROP POLICY IF EXISTS "Admins can update all attendances" ON public.attendances;
DROP POLICY IF EXISTS "Admins can delete all attendances" ON public.attendances;
DROP POLICY IF EXISTS "Users can view their attendances" ON public.attendances;
DROP POLICY IF EXISTS "Users can view their own attendances" ON public.attendances;
DROP POLICY IF EXISTS "Users can create their own attendances" ON public.attendances;
DROP POLICY IF EXISTS "Users can update their own attendances" ON public.attendances;
DROP POLICY IF EXISTS "Users can delete their own today attendances" ON public.attendances;

CREATE POLICY "attendances_select_policy" ON public.attendances
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "attendances_insert_policy" ON public.attendances
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "attendances_update_policy" ON public.attendances
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "attendances_delete_policy" ON public.attendances
  FOR DELETE
  USING (
    (user_id = (select auth.uid()) AND date = CURRENT_DATE)
    OR public.is_admin()
  );

-- ============================================================================
-- NOTIFICATIONS - Notifiche
-- ============================================================================

DROP POLICY IF EXISTS "Admin can view sent notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own and global notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR user_id IS NULL  -- Global notifications
    OR public.is_admin()
  );

CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- EMAIL_TEMPLATES - Template email
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view their templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can view their email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can insert their templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can insert their email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can update their templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can update their email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can delete their templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can delete their email templates" ON public.email_templates;

CREATE POLICY "email_templates_admin_policy" ON public.email_templates
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- DOCUMENTS - Documenti
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can upload documents for users" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Employees can view company documents" ON public.documents;
DROP POLICY IF EXISTS "Users can upload documents" ON public.documents;

CREATE POLICY "documents_select_policy" ON public.documents
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR (is_personal = false)  -- Company documents
    OR public.is_admin()
  );

CREATE POLICY "documents_insert_policy" ON public.documents
  FOR INSERT
  WITH CHECK (
    uploaded_by = (select auth.uid())
  );

-- ============================================================================
-- BUSINESS_TRIPS - Trasferte
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create business trips for others" ON public.business_trips;
DROP POLICY IF EXISTS "Admins can update all business trips" ON public.business_trips;
DROP POLICY IF EXISTS "Admins can view all business trips" ON public.business_trips;
DROP POLICY IF EXISTS "Users can create their own business trips" ON public.business_trips;
DROP POLICY IF EXISTS "Users can view their own business trips" ON public.business_trips;
DROP POLICY IF EXISTS "Users can update their own pending business trips" ON public.business_trips;

CREATE POLICY "business_trips_select_policy" ON public.business_trips
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "business_trips_insert_policy" ON public.business_trips
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "business_trips_update_policy" ON public.business_trips
  FOR UPDATE
  USING (
    (user_id = (select auth.uid()) AND status = 'pending')
    OR public.is_admin()
  );

-- ============================================================================
-- MULTIPLE_CHECKINS - Check-in multipli
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Admins can insert all checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Admins can update all checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Admins can delete all checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Users can view their own checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Users can insert their own checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Users can update their own checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Users can delete their own checkins" ON public.multiple_checkins;

CREATE POLICY "multiple_checkins_select_policy" ON public.multiple_checkins
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "multiple_checkins_insert_policy" ON public.multiple_checkins
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "multiple_checkins_update_policy" ON public.multiple_checkins
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "multiple_checkins_delete_policy" ON public.multiple_checkins
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- UNIFIED_ATTENDANCES - Presenze unificate
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage unified attendances" ON public.unified_attendances;
DROP POLICY IF EXISTS "Admins can view all unified attendances" ON public.unified_attendances;
DROP POLICY IF EXISTS "Users can manage own unified attendances" ON public.unified_attendances;
DROP POLICY IF EXISTS "Users can view own unified attendances" ON public.unified_attendances;

CREATE POLICY "unified_attendances_select_policy" ON public.unified_attendances
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "unified_attendances_insert_policy" ON public.unified_attendances
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "unified_attendances_update_policy" ON public.unified_attendances
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "unified_attendances_delete_policy" ON public.unified_attendances
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- LEAVE_REQUESTS - Richieste ferie
-- ============================================================================

DROP POLICY IF EXISTS "admin can insert" ON public.leave_requests;
DROP POLICY IF EXISTS "admin can select all" ON public.leave_requests;
DROP POLICY IF EXISTS "admin can update" ON public.leave_requests;
DROP POLICY IF EXISTS "admin can update status" ON public.leave_requests;
DROP POLICY IF EXISTS "users can insert their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "users can view their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "users can delete their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can manage leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can manage their leave requests" ON public.leave_requests;

CREATE POLICY "leave_requests_select_policy" ON public.leave_requests
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "leave_requests_insert_policy" ON public.leave_requests
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "leave_requests_update_policy" ON public.leave_requests
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "leave_requests_delete_policy" ON public.leave_requests
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- EMPLOYEE_LEAVE_BALANCE - Saldo ferie dipendenti
-- ============================================================================

DROP POLICY IF EXISTS "admin can manage leave balances" ON public.employee_leave_balance;
DROP POLICY IF EXISTS "admin can view all leave balances" ON public.employee_leave_balance;
DROP POLICY IF EXISTS "users can view own leave balance" ON public.employee_leave_balance;

CREATE POLICY "employee_leave_balance_select_policy" ON public.employee_leave_balance
  FOR SELECT
  USING (
    employee_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "employee_leave_balance_admin_policy" ON public.employee_leave_balance
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SENT_NOTIFICATIONS - Notifiche inviate
-- ============================================================================

DROP POLICY IF EXISTS "Admin can insert sent notifications" ON public.sent_notifications;
DROP POLICY IF EXISTS "Admin can view own sent notifications" ON public.sent_notifications;

CREATE POLICY "sent_notifications_admin_policy" ON public.sent_notifications
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- ATTENDANCE_ALERTS - Alert presenze
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all attendance alerts" ON public.attendance_alerts;
DROP POLICY IF EXISTS "Admins can manage attendance alerts" ON public.attendance_alerts;

CREATE POLICY "attendance_alerts_admin_policy" ON public.attendance_alerts
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- OVERTIME_RECORDS - Registri straordinari
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all overtime records" ON public.overtime_records;
DROP POLICY IF EXISTS "Users can view their own overtime records" ON public.overtime_records;

CREATE POLICY "overtime_records_select_policy" ON public.overtime_records
  FOR SELECT
  USING (
    employee_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "overtime_records_admin_policy" ON public.overtime_records
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SICK_LEAVES - Malattie
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all sick leaves" ON public.sick_leaves;
DROP POLICY IF EXISTS "Users can view their own sick leaves" ON public.sick_leaves;

CREATE POLICY "sick_leaves_select_policy" ON public.sick_leaves
  FOR SELECT
  USING (
    employee_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "sick_leaves_admin_policy" ON public.sick_leaves
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- WORKING_DAYS_TRACKING - Tracciamento giorni lavorativi
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all working days tracking" ON public.working_days_tracking;
DROP POLICY IF EXISTS "Users can view their own working days tracking" ON public.working_days_tracking;

CREATE POLICY "working_days_tracking_select_policy" ON public.working_days_tracking
  FOR SELECT
  USING (
    employee_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "working_days_tracking_admin_policy" ON public.working_days_tracking
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- EMPLOYEE_WORK_SCHEDULES - Orari lavoro dipendenti
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all employee work schedules" ON public.employee_work_schedules;
DROP POLICY IF EXISTS "Employees can view their own work schedules" ON public.employee_work_schedules;

CREATE POLICY "employee_work_schedules_select_policy" ON public.employee_work_schedules
  FOR SELECT
  USING (
    employee_id = (select auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "employee_work_schedules_admin_policy" ON public.employee_work_schedules
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- COMPANY_HOLIDAYS - Festività aziendali
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view their own company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Admins can insert their own company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Admins can update their own company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Admins can delete their own company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Employees can view company holidays" ON public.company_holidays;

CREATE POLICY "company_holidays_select_policy" ON public.company_holidays
  FOR SELECT
  USING (true);  -- Tutti possono vedere le festività

CREATE POLICY "company_holidays_admin_policy" ON public.company_holidays
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- EMPLOYEE_LOGO_SETTINGS - Impostazioni logo dipendenti
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view their own employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "Admins can insert their own employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "Admins can update their own employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "Admins can delete their own employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "Public can view employee logo settings" ON public.employee_logo_settings;

CREATE POLICY "employee_logo_settings_select_policy" ON public.employee_logo_settings
  FOR SELECT
  USING (true);  -- Pubblico per pagina login

CREATE POLICY "employee_logo_settings_admin_policy" ON public.employee_logo_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- LOGIN_SETTINGS - Impostazioni login
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view their own login settings" ON public.login_settings;
DROP POLICY IF EXISTS "Admins can insert their own login settings" ON public.login_settings;
DROP POLICY IF EXISTS "Admins can update their own login settings" ON public.login_settings;
DROP POLICY IF EXISTS "Admins can delete their own login settings" ON public.login_settings;
DROP POLICY IF EXISTS "Public can view login settings for login page" ON public.login_settings;

CREATE POLICY "login_settings_select_policy" ON public.login_settings
  FOR SELECT
  USING (true);  -- Pubblico per pagina login

CREATE POLICY "login_settings_admin_policy" ON public.login_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- ADMIN_SETTINGS - Impostazioni amministratore
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view their settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can insert their settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update their settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can delete their settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can manage admin settings" ON public.admin_settings;

CREATE POLICY "admin_settings_policy" ON public.admin_settings
  FOR ALL
  USING (
    admin_id = (select auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    admin_id = (select auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- DASHBOARD_SETTINGS - Impostazioni dashboard
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage their dashboard settings" ON public.dashboard_settings;

CREATE POLICY "dashboard_settings_admin_policy" ON public.dashboard_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- ATTENDANCE_SETTINGS - Impostazioni presenze
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can view attendance settings" ON public.attendance_settings;
DROP POLICY IF EXISTS "Only admins can modify attendance settings" ON public.attendance_settings;

CREATE POLICY "attendance_settings_select_policy" ON public.attendance_settings
  FOR SELECT
  USING (true);  -- Tutti gli utenti autenticati possono vedere

CREATE POLICY "attendance_settings_admin_policy" ON public.attendance_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- WORK_SCHEDULES - Orari di lavoro
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can view work schedules" ON public.work_schedules;
DROP POLICY IF EXISTS "Only admins can modify work schedules" ON public.work_schedules;
DROP POLICY IF EXISTS "Admins can manage work schedules" ON public.work_schedules;

CREATE POLICY "work_schedules_select_policy" ON public.work_schedules
  FOR SELECT
  USING (true);  -- Tutti gli utenti autenticati possono vedere

CREATE POLICY "work_schedules_admin_policy" ON public.work_schedules
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- APP_GENERAL_SETTINGS - Impostazioni generali app
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view their app general settings" ON public.app_general_settings;
DROP POLICY IF EXISTS "Admins can insert their app general settings" ON public.app_general_settings;
DROP POLICY IF EXISTS "Admins can update their app general settings" ON public.app_general_settings;
DROP POLICY IF EXISTS "Admins can delete their app general settings" ON public.app_general_settings;
DROP POLICY IF EXISTS "Public can view app general settings" ON public.app_general_settings;
DROP POLICY IF EXISTS "Admins can manage all" ON public.app_general_settings;

CREATE POLICY "app_general_settings_select_policy" ON public.app_general_settings
  FOR SELECT
  USING (true);  -- Pubblico per configurazioni base

CREATE POLICY "app_general_settings_admin_policy" ON public.app_general_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- APP_CONFIG - Configurazione app
-- ============================================================================

DROP POLICY IF EXISTS "Admin can manage app_config" ON public.app_config;
DROP POLICY IF EXISTS "Authenticated users can read app_config" ON public.app_config;

CREATE POLICY "app_config_select_policy" ON public.app_config
  FOR SELECT
  USING (true);  -- Tutti possono leggere

CREATE POLICY "app_config_admin_policy" ON public.app_config
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- CLEANUP_CONFIG - Configurazione pulizia
-- ============================================================================

DROP POLICY IF EXISTS "Admin can manage cleanup_config" ON public.cleanup_config;

CREATE POLICY "cleanup_config_admin_policy" ON public.cleanup_config
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- EDGE_RESPONSE - Risposte edge functions (debug)
-- ============================================================================

DROP POLICY IF EXISTS "Admin can view edge_response" ON public.edge_response;
DROP POLICY IF EXISTS "Admin can insert edge_response" ON public.edge_response;
DROP POLICY IF EXISTS "Service role can manage edge_response" ON public.edge_response;

CREATE POLICY "edge_response_admin_policy" ON public.edge_response
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "edge_response_service_role_policy" ON public.edge_response
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COMMENTI FINALI
-- ============================================================================

COMMENT ON FUNCTION public.is_admin() IS
'Funzione helper per verificare se l''utente corrente è admin.
Ottimizzata per RLS evitando valutazioni ripetute di auth.uid().';

-- Migration completata con successo
-- Tutti i warning di performance dovrebbero essere risolti
