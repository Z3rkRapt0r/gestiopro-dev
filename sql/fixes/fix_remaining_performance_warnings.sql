-- =====================================================
-- FIX REMAINING PERFORMANCE ADVISOR WARNINGS
-- Multiple Permissive Policies for Public Tables
-- =====================================================
-- Issue: Tables with public read access have overlapping policies:
--   1. *_admin_policy (FOR ALL) - includes SELECT
--   2. *_select_policy (FOR SELECT) - public read
-- Solution: Keep admin policy for INSERT/UPDATE/DELETE only
--           Keep select policy for SELECT (public read)
-- =====================================================

BEGIN;

-- =====================================================
-- APP_CONFIG
-- =====================================================
DROP POLICY IF EXISTS "app_config_admin_policy" ON public.app_config;
DROP POLICY IF EXISTS "app_config_select_policy" ON public.app_config;

-- Public can read
CREATE POLICY "app_config_select_policy" ON public.app_config
  FOR SELECT USING (true);

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "app_config_admin_insert_policy" ON public.app_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "app_config_admin_update_policy" ON public.app_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "app_config_admin_delete_policy" ON public.app_config
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- APP_GENERAL_SETTINGS
-- =====================================================
DROP POLICY IF EXISTS "app_general_settings_admin_policy" ON public.app_general_settings;
DROP POLICY IF EXISTS "app_general_settings_select_policy" ON public.app_general_settings;

-- Public can read
CREATE POLICY "app_general_settings_select_policy" ON public.app_general_settings
  FOR SELECT USING (true);

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "app_general_settings_admin_insert_policy" ON public.app_general_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "app_general_settings_admin_update_policy" ON public.app_general_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "app_general_settings_admin_delete_policy" ON public.app_general_settings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- ATTENDANCE_ALERTS
-- =====================================================
DROP POLICY IF EXISTS "attendance_alerts_admin_policy" ON public.attendance_alerts;
DROP POLICY IF EXISTS "attendance_alerts_select_policy" ON public.attendance_alerts;

-- Public can read
CREATE POLICY "attendance_alerts_select_policy" ON public.attendance_alerts
  FOR SELECT USING (true);

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "attendance_alerts_admin_insert_policy" ON public.attendance_alerts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "attendance_alerts_admin_update_policy" ON public.attendance_alerts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "attendance_alerts_admin_delete_policy" ON public.attendance_alerts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- ATTENDANCE_SETTINGS
-- =====================================================
DROP POLICY IF EXISTS "attendance_settings_admin_policy" ON public.attendance_settings;
DROP POLICY IF EXISTS "attendance_settings_select_policy" ON public.attendance_settings;

-- Public can read
CREATE POLICY "attendance_settings_select_policy" ON public.attendance_settings
  FOR SELECT USING (true);

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "attendance_settings_admin_insert_policy" ON public.attendance_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "attendance_settings_admin_update_policy" ON public.attendance_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "attendance_settings_admin_delete_policy" ON public.attendance_settings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- COMPANY_HOLIDAYS
-- =====================================================
DROP POLICY IF EXISTS "company_holidays_admin_policy" ON public.company_holidays;
DROP POLICY IF EXISTS "company_holidays_select_policy" ON public.company_holidays;

-- Public can read
CREATE POLICY "company_holidays_select_policy" ON public.company_holidays
  FOR SELECT USING (true);

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "company_holidays_admin_insert_policy" ON public.company_holidays
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "company_holidays_admin_update_policy" ON public.company_holidays
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "company_holidays_admin_delete_policy" ON public.company_holidays
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- EMPLOYEE_LEAVE_BALANCE
-- =====================================================
DROP POLICY IF EXISTS "employee_leave_balance_admin_policy" ON public.employee_leave_balance;
DROP POLICY IF EXISTS "employee_leave_balance_select_policy" ON public.employee_leave_balance;

-- Users can view their own, admins can view all
CREATE POLICY "employee_leave_balance_select_policy" ON public.employee_leave_balance
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "employee_leave_balance_admin_insert_policy" ON public.employee_leave_balance
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "employee_leave_balance_admin_update_policy" ON public.employee_leave_balance
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "employee_leave_balance_admin_delete_policy" ON public.employee_leave_balance
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- EMPLOYEE_LOGO_SETTINGS
-- =====================================================
DROP POLICY IF EXISTS "employee_logo_settings_admin_policy" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "employee_logo_settings_select_policy" ON public.employee_logo_settings;

-- Public can read
CREATE POLICY "employee_logo_settings_select_policy" ON public.employee_logo_settings
  FOR SELECT USING (true);

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "employee_logo_settings_admin_insert_policy" ON public.employee_logo_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "employee_logo_settings_admin_update_policy" ON public.employee_logo_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "employee_logo_settings_admin_delete_policy" ON public.employee_logo_settings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- EMPLOYEE_WORK_SCHEDULES
-- =====================================================
DROP POLICY IF EXISTS "employee_work_schedules_admin_policy" ON public.employee_work_schedules;
DROP POLICY IF EXISTS "employee_work_schedules_select_policy" ON public.employee_work_schedules;

-- Employees can view their own, admins can view all
CREATE POLICY "employee_work_schedules_select_policy" ON public.employee_work_schedules
  FOR SELECT USING (
    employee_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "employee_work_schedules_admin_insert_policy" ON public.employee_work_schedules
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "employee_work_schedules_admin_update_policy" ON public.employee_work_schedules
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "employee_work_schedules_admin_delete_policy" ON public.employee_work_schedules
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- LOGIN_SETTINGS
-- =====================================================
DROP POLICY IF EXISTS "login_settings_admin_policy" ON public.login_settings;
DROP POLICY IF EXISTS "login_settings_select_policy" ON public.login_settings;

-- Public can read
CREATE POLICY "login_settings_select_policy" ON public.login_settings
  FOR SELECT USING (true);

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "login_settings_admin_insert_policy" ON public.login_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "login_settings_admin_update_policy" ON public.login_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "login_settings_admin_delete_policy" ON public.login_settings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- OVERTIME_RECORDS
-- =====================================================
DROP POLICY IF EXISTS "overtime_records_admin_policy" ON public.overtime_records;
DROP POLICY IF EXISTS "overtime_records_select_policy" ON public.overtime_records;

-- Users can view their own, admins can view all
CREATE POLICY "overtime_records_select_policy" ON public.overtime_records
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "overtime_records_admin_insert_policy" ON public.overtime_records
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "overtime_records_admin_update_policy" ON public.overtime_records
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "overtime_records_admin_delete_policy" ON public.overtime_records
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- SICK_LEAVES
-- =====================================================
DROP POLICY IF EXISTS "sick_leaves_admin_policy" ON public.sick_leaves;
DROP POLICY IF EXISTS "sick_leaves_select_policy" ON public.sick_leaves;

-- Users can view their own, admins can view all
CREATE POLICY "sick_leaves_select_policy" ON public.sick_leaves
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "sick_leaves_admin_insert_policy" ON public.sick_leaves
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "sick_leaves_admin_update_policy" ON public.sick_leaves
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "sick_leaves_admin_delete_policy" ON public.sick_leaves
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- UNIFIED_ATTENDANCES
-- =====================================================
DROP POLICY IF EXISTS "unified_attendances_manage_policy" ON public.unified_attendances;
DROP POLICY IF EXISTS "unified_attendances_select_policy" ON public.unified_attendances;

-- Users can view their own, admins can view all
CREATE POLICY "unified_attendances_select_policy" ON public.unified_attendances
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Users can manage their own, admins can manage all
CREATE POLICY "unified_attendances_insert_policy" ON public.unified_attendances
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "unified_attendances_update_policy" ON public.unified_attendances
  FOR UPDATE USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "unified_attendances_delete_policy" ON public.unified_attendances
  FOR DELETE USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- WORK_SCHEDULES
-- =====================================================
DROP POLICY IF EXISTS "work_schedules_admin_policy" ON public.work_schedules;
DROP POLICY IF EXISTS "work_schedules_select_policy" ON public.work_schedules;

-- Public can read
CREATE POLICY "work_schedules_select_policy" ON public.work_schedules
  FOR SELECT USING (true);

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "work_schedules_admin_insert_policy" ON public.work_schedules
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "work_schedules_admin_update_policy" ON public.work_schedules
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "work_schedules_admin_delete_policy" ON public.work_schedules
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- WORKING_DAYS_TRACKING
-- =====================================================
DROP POLICY IF EXISTS "working_days_tracking_admin_policy" ON public.working_days_tracking;
DROP POLICY IF EXISTS "working_days_tracking_select_policy" ON public.working_days_tracking;

-- Users can view their own, admins can view all
CREATE POLICY "working_days_tracking_select_policy" ON public.working_days_tracking
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Admin can manage (INSERT, UPDATE, DELETE only)
CREATE POLICY "working_days_tracking_admin_insert_policy" ON public.working_days_tracking
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "working_days_tracking_admin_update_policy" ON public.working_days_tracking
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "working_days_tracking_admin_delete_policy" ON public.working_days_tracking
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

COMMIT;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify no duplicate policies remain:
-- SELECT schemaname, tablename, policyname, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, cmd, policyname;


