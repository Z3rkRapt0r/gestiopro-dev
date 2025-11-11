-- ============================================================================
-- CLEANUP POLITICHE RLS VECCHIE - RIMOZIONE DUPLICATI
-- ============================================================================
-- Questa migration rimuove tutte le vecchie policy che causano i warning
-- mantenendo solo quelle ottimizzate create nelle migration precedenti
-- Data: 2025-01-12
-- ============================================================================

-- ============================================================================
-- BUSINESS_TRIPS - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Admins can create business trips for others" ON public.business_trips;
DROP POLICY IF EXISTS "Admins can delete all business trips" ON public.business_trips;
DROP POLICY IF EXISTS "Admins can update all business trips" ON public.business_trips;
DROP POLICY IF EXISTS "Users can create their own business trips" ON public.business_trips;
DROP POLICY IF EXISTS "Users can update their own pending business trips" ON public.business_trips;
DROP POLICY IF EXISTS "Users can view their own business trips" ON public.business_trips;

-- ============================================================================
-- COMPANY_HOLIDAYS - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Admins can delete their own company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Admins can insert their own company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Admins can update their own company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Admins can view their own company holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Employees can view company holidays" ON public.company_holidays;

-- ============================================================================
-- EMPLOYEE_LOGO_SETTINGS - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Admins can delete their own employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "Admins can insert their own employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "Admins can update their own employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "Admins can view their own employee logo settings" ON public.employee_logo_settings;
DROP POLICY IF EXISTS "Public can view employee logo settings" ON public.employee_logo_settings;

-- ============================================================================
-- LOGIN_SETTINGS - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Admins can delete their own login settings" ON public.login_settings;
DROP POLICY IF EXISTS "Admins can insert their own login settings" ON public.login_settings;
DROP POLICY IF EXISTS "Admins can update their own login settings" ON public.login_settings;
DROP POLICY IF EXISTS "Admins can view their own login settings" ON public.login_settings;
DROP POLICY IF EXISTS "Public can view login settings for login page" ON public.login_settings;

-- ============================================================================
-- MULTIPLE_CHECKINS - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Admins can delete all checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Admins can insert all checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Admins can update all checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Users can delete their own checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Users can insert their own checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Users can update their own checkins" ON public.multiple_checkins;
DROP POLICY IF EXISTS "Users can view their own checkins" ON public.multiple_checkins;

-- ============================================================================
-- OVERTIME_RECORDS - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage all overtime records" ON public.overtime_records;
DROP POLICY IF EXISTS "Users can view their own overtime records" ON public.overtime_records;

-- ============================================================================
-- SENT_NOTIFICATIONS - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Admin can insert sent notifications" ON public.sent_notifications;
DROP POLICY IF EXISTS "Admin can view own sent notifications" ON public.sent_notifications;

-- ============================================================================
-- SICK_LEAVES - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage all sick leaves" ON public.sick_leaves;
DROP POLICY IF EXISTS "Users can view their own sick leaves" ON public.sick_leaves;

-- ============================================================================
-- UNIFIED_ATTENDANCES - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Users can manage own unified attendances" ON public.unified_attendances;
DROP POLICY IF EXISTS "Users can view own unified attendances" ON public.unified_attendances;

-- ============================================================================
-- WORKING_DAYS_TRACKING - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage all working days tracking" ON public.working_days_tracking;
DROP POLICY IF EXISTS "Users can view their own working days tracking" ON public.working_days_tracking;

-- ============================================================================
-- EDGE_RESPONSE - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Admin can insert edge_response" ON public.edge_response;
DROP POLICY IF EXISTS "Admin can view edge_response" ON public.edge_response;

-- ============================================================================
-- APP_CONFIG - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Admin can manage app_config" ON public.app_config;
DROP POLICY IF EXISTS "Authenticated users can read app_config" ON public.app_config;

-- ============================================================================
-- CLEANUP_CONFIG - Rimozione policy vecchie
-- ============================================================================
DROP POLICY IF EXISTS "Admin can manage cleanup_config" ON public.cleanup_config;

-- ============================================================================
-- ATTENDANCE_ALERTS - Rimozione policy vecchia aggiuntiva
-- ============================================================================
DROP POLICY IF EXISTS "System can insert attendance alerts" ON public.attendance_alerts;

-- Cleanup completato - ora dovrebbero rimanere solo le policy ottimizzate
