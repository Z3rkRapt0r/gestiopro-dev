-- =====================================================
-- FIX PERFORMANCE ADVISOR WARNINGS
-- =====================================================
-- Questo script risolve i warning del Performance Advisor:
-- 1. Auth RLS Initialization Plan - wrappa auth.uid() con (select auth.uid())
-- 2. Multiple Permissive Policies - consolida le policy multiple
-- =====================================================

-- Disabilita temporaneamente RLS per fare le modifiche
SET session_replication_role = 'replica';

-- =====================================================
-- BUSINESS TRIPS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can create business trips for others" ON public.business_trips;
DROP POLICY IF EXISTS "Admins can update all business trips" ON public.business_trips;
DROP POLICY IF EXISTS "Users can create their own business trips" ON public.business_trips;
DROP POLICY IF EXISTS "Users can update their own pending business trips" ON public.business_trips;
DROP POLICY IF EXISTS "Users can view their own business trips" ON public.business_trips;
DROP POLICY IF EXISTS "Admins can delete all business trips" ON public.business_trips;
DROP POLICY IF EXISTS "business_trips_select_policy" ON public.business_trips;
DROP POLICY IF EXISTS "business_trips_insert_policy" ON public.business_trips;
DROP POLICY IF EXISTS "business_trips_update_policy" ON public.business_trips;
DROP POLICY IF EXISTS "business_trips_delete_policy" ON public.business_trips;

-- Create consolidated policies
CREATE POLICY "business_trips_select_policy" ON public.business_trips
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "business_trips_insert_policy" ON public.business_trips
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "business_trips_update_policy" ON public.business_trips
  FOR UPDATE USING (
    (user_id = (SELECT auth.uid()) AND status = 'pending') OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "business_trips_delete_policy" ON public.business_trips
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- COMPANY HOLIDAYS
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete their own company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Admins can insert their own company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Admins can update their own company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Admins can view their own company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Employees can view company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "company_holidays_admin_policy" ON public.company_holidays;
DROP POLICY IF EXISTS "company_holidays_select_policy" ON public.company_holidays;

CREATE POLICY "company_holidays_select_policy" ON public.company_holidays
  FOR SELECT USING (true);

CREATE POLICY "company_holidays_admin_policy" ON public.company_holidays
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- EMPLOYEE LOGO SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete their own employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "Admins can insert their own employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "Admins can update their own employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "Admins can view their own employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "Public can view employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "employee_logo_settings_policy" ON public.employee_logo_settings;

CREATE POLICY "employee_logo_settings_select_policy" ON public.employee_logo_settings
  FOR SELECT USING (true);

CREATE POLICY "employee_logo_settings_admin_policy" ON public.employee_logo_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- LOGIN SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete their own login settings" ON public.login_settings;
DROP POLICY IF EXISTS "Admins can insert their own login settings" ON public.login_settings;
DROP POLICY IF EXISTS "Admins can update their own login settings" ON public.login_settings;
DROP POLICY IF EXISTS "Admins can view their own login settings" ON public.login_settings;
DROP POLICY IF EXISTS "Public can view login settings for login page" ON public.login_settings;
DROP POLICY IF EXISTS "login_settings_admin_policy" ON public.login_settings;
DROP POLICY IF EXISTS "login_settings_select_policy" ON public.login_settings;

CREATE POLICY "login_settings_select_policy" ON public.login_settings
  FOR SELECT USING (true);

CREATE POLICY "login_settings_admin_policy" ON public.login_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- MULTIPLE CHECKINS
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete all checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Admins can insert all checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Admins can update all checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Users can delete their own checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Users can insert their own checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Users can update their own checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Users can view their own checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "multiple_checkins_select_policy" ON public.multiple_checkins;
DROP POLICY IF EXISTS "multiple_checkins_insert_policy" ON public.multiple_checkins;
DROP POLICY IF EXISTS "multiple_checkins_update_policy" ON public.multiple_checkins;
DROP POLICY IF EXISTS "multiple_checkins_delete_policy" ON public.multiple_checkins;

CREATE POLICY "multiple_checkins_select_policy" ON public.multiple_checkins
  FOR SELECT USING (
    employee_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "multiple_checkins_insert_policy" ON public.multiple_checkins
  FOR INSERT WITH CHECK (
    employee_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "multiple_checkins_update_policy" ON public.multiple_checkins
  FOR UPDATE USING (
    employee_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "multiple_checkins_delete_policy" ON public.multiple_checkins
  FOR DELETE USING (
    employee_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- OVERTIME RECORDS
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage all overtime records" ON public.overtime_records;
DROP POLICY IF EXISTS "Users can view their own overtime records" ON public.overtime_records;
DROP POLICY IF EXISTS "overtime_records_admin_policy" ON public.overtime_records;
DROP POLICY IF EXISTS "overtime_records_select_policy" ON public.overtime_records;

CREATE POLICY "overtime_records_select_policy" ON public.overtime_records
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "overtime_records_admin_policy" ON public.overtime_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- SENT NOTIFICATIONS
-- =====================================================

DROP POLICY IF EXISTS "Admin can insert sent notifications" ON public.sent_notifications;
DROP POLICY IF EXISTS "Admin can view own sent notifications" ON public.sent_notifications;
DROP POLICY IF EXISTS "sent_notifications_policy" ON public.sent_notifications;

CREATE POLICY "sent_notifications_policy" ON public.sent_notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- SICK LEAVES
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage all sick leaves" ON public.sick_leaves;
DROP POLICY IF EXISTS "Users can view their own sick leaves" ON public.sick_leaves;
DROP POLICY IF EXISTS "sick_leaves_select_policy" ON public.sick_leaves;
DROP POLICY IF EXISTS "sick_leaves_insert_policy" ON public.sick_leaves;
DROP POLICY IF EXISTS "sick_leaves_update_policy" ON public.sick_leaves;
DROP POLICY IF EXISTS "sick_leaves_delete_policy" ON public.sick_leaves;

CREATE POLICY "sick_leaves_select_policy" ON public.sick_leaves
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "sick_leaves_admin_policy" ON public.sick_leaves
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- UNIFIED ATTENDANCES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own unified attendances" ON public.unified_attendances;
DROP POLICY IF EXISTS "Users can view own unified attendances" ON public.unified_attendances;
DROP POLICY IF EXISTS "unified_attendances_admin_policy" ON public.unified_attendances;
DROP POLICY IF EXISTS "unified_attendances_select_policy" ON public.unified_attendances;

CREATE POLICY "unified_attendances_select_policy" ON public.unified_attendances
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "unified_attendances_manage_policy" ON public.unified_attendances
  FOR ALL USING (
    user_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- WORKING DAYS TRACKING
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage all working days tracking" ON public.working_days_tracking;
DROP POLICY IF EXISTS "Users can view their own working days tracking" ON public.working_days_tracking;
DROP POLICY IF EXISTS "working_days_tracking_admin_policy" ON public.working_days_tracking;
DROP POLICY IF EXISTS "working_days_tracking_select_policy" ON public.working_days_tracking;

CREATE POLICY "working_days_tracking_select_policy" ON public.working_days_tracking
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "working_days_tracking_admin_policy" ON public.working_days_tracking
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- EDGE RESPONSE
-- =====================================================

DROP POLICY IF EXISTS "Admin can insert edge_response" ON public.edge_response;
DROP POLICY IF EXISTS "Admin can view edge_response" ON public.edge_response;

CREATE POLICY "edge_response_admin_policy" ON public.edge_response
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- APP CONFIG
-- =====================================================

DROP POLICY IF EXISTS "Admin can manage app_config" ON public.app_config;
DROP POLICY IF EXISTS "Authenticated users can read app_config" ON public.app_config;

CREATE POLICY "app_config_select_policy" ON public.app_config
  FOR SELECT USING (true);

CREATE POLICY "app_config_admin_policy" ON public.app_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- CLEANUP CONFIG
-- =====================================================

DROP POLICY IF EXISTS "Admin can manage cleanup_config" ON public.cleanup_config;

CREATE POLICY "cleanup_config_admin_policy" ON public.cleanup_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- APP GENERAL SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "app_general_settings_admin_policy" ON public.app_general_settings;
DROP POLICY IF EXISTS "app_general_settings_select_policy" ON public.app_general_settings;

CREATE POLICY "app_general_settings_select_policy" ON public.app_general_settings
  FOR SELECT USING (true);

CREATE POLICY "app_general_settings_admin_policy" ON public.app_general_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- ATTENDANCE ALERTS
-- =====================================================

DROP POLICY IF EXISTS "System can insert attendance alerts" ON public.attendance_alerts;
DROP POLICY IF EXISTS "attendance_alerts_admin_policy" ON public.attendance_alerts;
DROP POLICY IF EXISTS "attendance_alerts_select_policy" ON public.attendance_alerts;

CREATE POLICY "attendance_alerts_select_policy" ON public.attendance_alerts
  FOR SELECT USING (true);

CREATE POLICY "attendance_alerts_admin_policy" ON public.attendance_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- ATTENDANCE SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "attendance_settings_admin_policy" ON public.attendance_settings;
DROP POLICY IF EXISTS "attendance_settings_select_policy" ON public.attendance_settings;

CREATE POLICY "attendance_settings_select_policy" ON public.attendance_settings
  FOR SELECT USING (true);

CREATE POLICY "attendance_settings_admin_policy" ON public.attendance_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- EMPLOYEE LEAVE BALANCE
-- =====================================================

DROP POLICY IF EXISTS "employee_leave_balance_admin_policy" ON public.employee_leave_balance;
DROP POLICY IF EXISTS "employee_leave_balance_select_policy" ON public.employee_leave_balance;

CREATE POLICY "employee_leave_balance_select_policy" ON public.employee_leave_balance
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "employee_leave_balance_admin_policy" ON public.employee_leave_balance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- EMPLOYEE WORK SCHEDULES
-- =====================================================

DROP POLICY IF EXISTS "employee_work_schedules_admin_policy" ON public.employee_work_schedules;
DROP POLICY IF EXISTS "employee_work_schedules_select_policy" ON public.employee_work_schedules;

CREATE POLICY "employee_work_schedules_select_policy" ON public.employee_work_schedules
  FOR SELECT USING (
    employee_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "employee_work_schedules_admin_policy" ON public.employee_work_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- WORK SCHEDULES
-- =====================================================

DROP POLICY IF EXISTS "work_schedules_admin_policy" ON public.work_schedules;
DROP POLICY IF EXISTS "work_schedules_select_policy" ON public.work_schedules;

CREATE POLICY "work_schedules_select_policy" ON public.work_schedules
  FOR SELECT USING (true);

CREATE POLICY "work_schedules_admin_policy" ON public.work_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Riabilita RLS
SET session_replication_role = 'origin';

-- =====================================================
-- VERIFICA
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

COMMENT ON SCHEMA public IS 'Performance Advisor warnings fixed - All auth.uid() wrapped with (select auth.uid()) and multiple policies consolidated';

