-- ============================================================================
-- OTTIMIZZAZIONE PERFORMANCE POLITICHE RLS - SOLO TABELLE CORE
-- ============================================================================
-- Questa migration ottimizza solo le tabelle principali confermando esistenti
-- Data: 2025-01-12
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Verifica se l'utente è admin
-- ============================================================================
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
-- PROFILES
-- ============================================================================

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

CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (id = (select auth.uid()) OR public.is_admin());

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (id = (select auth.uid()) OR public.is_admin());

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (id = (select auth.uid()) OR public.is_admin());

CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE USING (id = (select auth.uid()) OR public.is_admin());

-- ============================================================================
-- ATTENDANCES
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
  FOR SELECT USING (user_id = (select auth.uid()) OR public.is_admin());

CREATE POLICY "attendances_insert_policy" ON public.attendances
  FOR INSERT WITH CHECK (user_id = (select auth.uid()) OR public.is_admin());

CREATE POLICY "attendances_update_policy" ON public.attendances
  FOR UPDATE USING (user_id = (select auth.uid()) OR public.is_admin());

CREATE POLICY "attendances_delete_policy" ON public.attendances
  FOR DELETE USING ((user_id = (select auth.uid()) AND date = CURRENT_DATE) OR public.is_admin());

-- ============================================================================
-- NOTIFICATIONS
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
  FOR SELECT USING (user_id = (select auth.uid()) OR user_id IS NULL OR public.is_admin());

CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE USING (user_id = (select auth.uid()) OR public.is_admin());

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can upload documents for users" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Employees can view company documents" ON public.documents;
DROP POLICY IF EXISTS "Users can upload documents" ON public.documents;

CREATE POLICY "documents_select_policy" ON public.documents
  FOR SELECT USING (user_id = (select auth.uid()) OR (is_personal = false) OR public.is_admin());

CREATE POLICY "documents_insert_policy" ON public.documents
  FOR INSERT WITH CHECK (uploaded_by = (select auth.uid()));

-- ============================================================================
-- LEAVE_REQUESTS
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
  FOR SELECT USING (user_id = (select auth.uid()) OR public.is_admin());

CREATE POLICY "leave_requests_insert_policy" ON public.leave_requests
  FOR INSERT WITH CHECK (user_id = (select auth.uid()) OR public.is_admin());

CREATE POLICY "leave_requests_update_policy" ON public.leave_requests
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "leave_requests_delete_policy" ON public.leave_requests
  FOR DELETE USING (user_id = (select auth.uid()) OR public.is_admin());

-- ============================================================================
-- EMAIL_TEMPLATES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view their templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can view their email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can insert their templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can insert their email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can update their templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can update their email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can delete their templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can delete their email templates" ON public.email_templates;

CREATE POLICY "email_templates_policy" ON public.email_templates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- ADMIN_SETTINGS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view their settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can insert their settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update their settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can delete their settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can manage admin settings" ON public.admin_settings;

CREATE POLICY "admin_settings_policy" ON public.admin_settings
  FOR ALL USING (admin_id = (select auth.uid()) OR public.is_admin())
  WITH CHECK (admin_id = (select auth.uid()) OR public.is_admin());

-- ============================================================================
-- WORK_SCHEDULES
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can view work schedules" ON public.work_schedules;
DROP POLICY IF EXISTS "Only admins can modify work schedules" ON public.work_schedules;
DROP POLICY IF EXISTS "Admins can manage work schedules" ON public.work_schedules;

CREATE POLICY "work_schedules_select_policy" ON public.work_schedules
  FOR SELECT USING (true);

CREATE POLICY "work_schedules_admin_policy" ON public.work_schedules
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- APP_GENERAL_SETTINGS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view their app general settings" ON public.app_general_settings;
DROP POLICY IF EXISTS "Admins can insert their app general settings" ON public.app_general_settings;
DROP POLICY IF EXISTS "Admins can update their app general settings" ON public.app_general_settings;
DROP POLICY IF EXISTS "Admins can delete their app general settings" ON public.app_general_settings;
DROP POLICY IF EXISTS "Public can view app general settings" ON public.app_general_settings;
DROP POLICY IF EXISTS "Admins can manage all" ON public.app_general_settings;

CREATE POLICY "app_general_settings_select_policy" ON public.app_general_settings
  FOR SELECT USING (true);

CREATE POLICY "app_general_settings_admin_policy" ON public.app_general_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- ATTENDANCE_SETTINGS
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can view attendance settings" ON public.attendance_settings;
DROP POLICY IF EXISTS "Only admins can modify attendance settings" ON public.attendance_settings;

CREATE POLICY "attendance_settings_select_policy" ON public.attendance_settings
  FOR SELECT USING (true);

CREATE POLICY "attendance_settings_admin_policy" ON public.attendance_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Completata ottimizzazione tabelle core
