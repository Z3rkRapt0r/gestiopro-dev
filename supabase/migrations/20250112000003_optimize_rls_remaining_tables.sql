-- ============================================================================
-- OTTIMIZZAZIONE PERFORMANCE POLITICHE RLS - TABELLE RIMANENTI
-- ============================================================================
-- Questa migration ottimizza le tabelle rimanenti con i nomi colonna corretti
-- Data: 2025-01-12
-- ============================================================================

-- ============================================================================
-- TABELLE CON user_id
-- ============================================================================

-- BUSINESS_TRIPS (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_trips') THEN
    DROP POLICY IF EXISTS "Users can view their business trips" ON public.business_trips;
    DROP POLICY IF EXISTS "Users can create their business trips" ON public.business_trips;
    DROP POLICY IF EXISTS "Admins can view all business trips" ON public.business_trips;
    DROP POLICY IF EXISTS "Admins can manage business trips" ON public.business_trips;

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
        user_id = (select auth.uid())
        OR public.is_admin()
      );

    CREATE POLICY "business_trips_delete_policy" ON public.business_trips
      FOR DELETE
      USING (
        user_id = (select auth.uid())
        OR public.is_admin()
      );
  END IF;
END $$;

-- EMPLOYEE_LEAVE_BALANCE (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_leave_balance') THEN
    DROP POLICY IF EXISTS "admin can manage leave balances" ON public.employee_leave_balance;
    DROP POLICY IF EXISTS "admin can view all leave balances" ON public.employee_leave_balance;
    DROP POLICY IF EXISTS "users can view own leave balance" ON public.employee_leave_balance;

    CREATE POLICY "employee_leave_balance_select_policy" ON public.employee_leave_balance
      FOR SELECT
      USING (
        user_id = (select auth.uid())
        OR public.is_admin()
      );

    CREATE POLICY "employee_leave_balance_admin_policy" ON public.employee_leave_balance
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- OVERTIME_RECORDS (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'overtime_records') THEN
    DROP POLICY IF EXISTS "Users can view their overtime records" ON public.overtime_records;
    DROP POLICY IF EXISTS "Users can create their overtime records" ON public.overtime_records;
    DROP POLICY IF EXISTS "Admins can view all overtime records" ON public.overtime_records;
    DROP POLICY IF EXISTS "Admins can manage overtime records" ON public.overtime_records;

    CREATE POLICY "overtime_records_select_policy" ON public.overtime_records
      FOR SELECT
      USING (
        user_id = (select auth.uid())
        OR public.is_admin()
      );

    CREATE POLICY "overtime_records_admin_policy" ON public.overtime_records
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- SICK_LEAVES (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sick_leaves') THEN
    DROP POLICY IF EXISTS "Users can view their sick leaves" ON public.sick_leaves;
    DROP POLICY IF EXISTS "Users can create their sick leaves" ON public.sick_leaves;
    DROP POLICY IF EXISTS "Admins can view all sick leaves" ON public.sick_leaves;
    DROP POLICY IF EXISTS "Admins can manage sick leaves" ON public.sick_leaves;

    CREATE POLICY "sick_leaves_select_policy" ON public.sick_leaves
      FOR SELECT
      USING (
        user_id = (select auth.uid())
        OR public.is_admin()
      );

    CREATE POLICY "sick_leaves_insert_policy" ON public.sick_leaves
      FOR INSERT
      WITH CHECK (
        user_id = (select auth.uid())
        OR public.is_admin()
      );

    CREATE POLICY "sick_leaves_update_policy" ON public.sick_leaves
      FOR UPDATE
      USING (public.is_admin());

    CREATE POLICY "sick_leaves_delete_policy" ON public.sick_leaves
      FOR DELETE
      USING (
        user_id = (select auth.uid())
        OR public.is_admin()
      );
  END IF;
END $$;

-- UNIFIED_ATTENDANCES (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'unified_attendances') THEN
    DROP POLICY IF EXISTS "Users can view their unified attendances" ON public.unified_attendances;
    DROP POLICY IF EXISTS "Admins can view all unified attendances" ON public.unified_attendances;
    DROP POLICY IF EXISTS "Admins can manage unified attendances" ON public.unified_attendances;

    CREATE POLICY "unified_attendances_select_policy" ON public.unified_attendances
      FOR SELECT
      USING (
        user_id = (select auth.uid())
        OR public.is_admin()
      );

    CREATE POLICY "unified_attendances_admin_policy" ON public.unified_attendances
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- WORKING_DAYS_TRACKING (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'working_days_tracking') THEN
    DROP POLICY IF EXISTS "Users can view their working days" ON public.working_days_tracking;
    DROP POLICY IF EXISTS "Admins can view all working days" ON public.working_days_tracking;
    DROP POLICY IF EXISTS "Admins can manage working days" ON public.working_days_tracking;

    CREATE POLICY "working_days_tracking_select_policy" ON public.working_days_tracking
      FOR SELECT
      USING (
        user_id = (select auth.uid())
        OR public.is_admin()
      );

    CREATE POLICY "working_days_tracking_admin_policy" ON public.working_days_tracking
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ============================================================================
-- TABELLE CON employee_id
-- ============================================================================

-- EMPLOYEE_WORK_SCHEDULES (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_work_schedules') THEN
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
  END IF;
END $$;

-- MULTIPLE_CHECKINS (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'multiple_checkins') THEN
    DROP POLICY IF EXISTS "Users can view their checkins" ON public.multiple_checkins;
    DROP POLICY IF EXISTS "Users can create their checkins" ON public.multiple_checkins;
    DROP POLICY IF EXISTS "Admins can view all checkins" ON public.multiple_checkins;
    DROP POLICY IF EXISTS "Admins can manage checkins" ON public.multiple_checkins;

    CREATE POLICY "multiple_checkins_select_policy" ON public.multiple_checkins
      FOR SELECT
      USING (
        employee_id = (select auth.uid())
        OR public.is_admin()
      );

    CREATE POLICY "multiple_checkins_insert_policy" ON public.multiple_checkins
      FOR INSERT
      WITH CHECK (
        employee_id = (select auth.uid())
        OR public.is_admin()
      );

    CREATE POLICY "multiple_checkins_update_policy" ON public.multiple_checkins
      FOR UPDATE
      USING (
        employee_id = (select auth.uid())
        OR public.is_admin()
      );

    CREATE POLICY "multiple_checkins_delete_policy" ON public.multiple_checkins
      FOR DELETE
      USING (
        employee_id = (select auth.uid())
        OR public.is_admin()
      );
  END IF;
END $$;

-- ============================================================================
-- TABELLE CON admin_id
-- ============================================================================

-- COMPANY_HOLIDAYS (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_holidays') THEN
    DROP POLICY IF EXISTS "All users can view company holidays" ON public.company_holidays;
    DROP POLICY IF EXISTS "Admins can manage company holidays" ON public.company_holidays;

    CREATE POLICY "company_holidays_select_policy" ON public.company_holidays
      FOR SELECT
      USING (true);

    CREATE POLICY "company_holidays_admin_policy" ON public.company_holidays
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- DASHBOARD_SETTINGS (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dashboard_settings') THEN
    DROP POLICY IF EXISTS "Admins can view their dashboard settings" ON public.dashboard_settings;
    DROP POLICY IF EXISTS "Admins can manage their dashboard settings" ON public.dashboard_settings;

    CREATE POLICY "dashboard_settings_policy" ON public.dashboard_settings
      FOR ALL
      USING (
        admin_id = (select auth.uid())
        OR public.is_admin()
      )
      WITH CHECK (
        admin_id = (select auth.uid())
        OR public.is_admin()
      );
  END IF;
END $$;

-- EMPLOYEE_LOGO_SETTINGS (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_logo_settings') THEN
    DROP POLICY IF EXISTS "Admins can view their logo settings" ON public.employee_logo_settings;
    DROP POLICY IF EXISTS "Admins can manage their logo settings" ON public.employee_logo_settings;

    CREATE POLICY "employee_logo_settings_policy" ON public.employee_logo_settings
      FOR ALL
      USING (
        admin_id = (select auth.uid())
        OR public.is_admin()
      )
      WITH CHECK (
        admin_id = (select auth.uid())
        OR public.is_admin()
      );
  END IF;
END $$;

-- LOGIN_SETTINGS (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'login_settings') THEN
    DROP POLICY IF EXISTS "All users can view login settings" ON public.login_settings;
    DROP POLICY IF EXISTS "Admins can manage login settings" ON public.login_settings;

    CREATE POLICY "login_settings_select_policy" ON public.login_settings
      FOR SELECT
      USING (true);

    CREATE POLICY "login_settings_admin_policy" ON public.login_settings
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- SENT_NOTIFICATIONS (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sent_notifications') THEN
    DROP POLICY IF EXISTS "Admins can view sent notifications" ON public.sent_notifications;
    DROP POLICY IF EXISTS "Admins can manage sent notifications" ON public.sent_notifications;

    CREATE POLICY "sent_notifications_policy" ON public.sent_notifications
      FOR ALL
      USING (
        admin_id = (select auth.uid())
        OR public.is_admin()
      )
      WITH CHECK (
        admin_id = (select auth.uid())
        OR public.is_admin()
      );
  END IF;
END $$;

-- ============================================================================
-- TABELLE SPECIALI CON COLONNE MULTIPLE
-- ============================================================================

-- ATTENDANCE_ALERTS (ha sia employee_id che admin_id)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_alerts') THEN
    DROP POLICY IF EXISTS "Admins can view all attendance alerts" ON public.attendance_alerts;
    DROP POLICY IF EXISTS "Admins can manage attendance alerts" ON public.attendance_alerts;
    DROP POLICY IF EXISTS "Employees can view their alerts" ON public.attendance_alerts;

    -- Gli admin e gli employee coinvolti possono vedere gli alert
    CREATE POLICY "attendance_alerts_select_policy" ON public.attendance_alerts
      FOR SELECT
      USING (
        employee_id = (select auth.uid())
        OR admin_id = (select auth.uid())
        OR public.is_admin()
      );

    -- Solo admin possono gestire gli alert
    CREATE POLICY "attendance_alerts_admin_policy" ON public.attendance_alerts
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ============================================================================
-- TABELLE DI CONFIGURAZIONE (già ottimizzate in migration precedente)
-- ============================================================================

-- APP_CONFIG, CLEANUP_CONFIG, EDGE_RESPONSE sono già stati ottimizzati
-- nella migration 20250112000001_optimize_rls_performance_fixed.sql

-- Migration completata
COMMENT ON FUNCTION public.is_admin() IS
'Funzione helper per verificare se l''utente corrente è admin.
Usata in tutte le policy RLS per ottimizzare le performance.';
