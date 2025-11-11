-- =====================================================
-- AUTOMATIC OVERTIME DETECTION FOR EARLY CHECK-IN
-- =====================================================
-- Enables automatic overtime recording when employees
-- check in before their scheduled work start time.
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ADD CONFIGURATION TO ADMIN_SETTINGS
-- =====================================================

-- Add columns for automatic overtime detection configuration
ALTER TABLE public.admin_settings 
  ADD COLUMN IF NOT EXISTS enable_auto_overtime_checkin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_overtime_tolerance_minutes INTEGER DEFAULT 15;

COMMENT ON COLUMN public.admin_settings.enable_auto_overtime_checkin IS 
  'Enable automatic overtime detection for early check-ins';
COMMENT ON COLUMN public.admin_settings.auto_overtime_tolerance_minutes IS 
  'Tolerance in minutes before considering early check-in as overtime (default: 15)';

-- =====================================================
-- 2. MODIFY OVERTIME_RECORDS TABLE
-- =====================================================

-- Add columns to distinguish automatic vs manual overtime
ALTER TABLE public.overtime_records
  ADD COLUMN IF NOT EXISTS overtime_type VARCHAR(20) DEFAULT 'manual' CHECK (overtime_type IN ('manual', 'automatic_checkin', 'automatic_checkout')),
  ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS calculated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reason TEXT;

COMMENT ON COLUMN public.overtime_records.overtime_type IS 
  'Type of overtime: manual, automatic_checkin, automatic_checkout';
COMMENT ON COLUMN public.overtime_records.is_automatic IS 
  'Whether this overtime was automatically detected by the system';
COMMENT ON COLUMN public.overtime_records.calculated_minutes IS 
  'Minutes calculated by the automatic detection system';
COMMENT ON COLUMN public.overtime_records.approval_status IS 
  'Approval status for automatic overtime records';
COMMENT ON COLUMN public.overtime_records.reason IS 
  'Description or reason for the overtime (auto-generated for automatic overtimes)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_overtime_records_date_type 
  ON public.overtime_records(date, overtime_type);
CREATE INDEX IF NOT EXISTS idx_overtime_records_user_date 
  ON public.overtime_records(user_id, date);

-- =====================================================
-- 3. FUNCTION TO CALCULATE AUTOMATIC OVERTIME
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.calculate_automatic_overtime_checkin() CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_automatic_overtime_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_settings RECORD;
  v_work_schedule RECORD;
  v_check_in_time TIME;
  v_work_start_time TIME;
  v_diff_minutes INTEGER;
  v_existing_overtime INTEGER;
BEGIN
  -- Only process on INSERT or UPDATE of check_in_time
  IF (TG_OP = 'INSERT' AND NEW.check_in_time IS NULL) OR
     (TG_OP = 'UPDATE' AND NEW.check_in_time IS NULL) OR
     (TG_OP = 'UPDATE' AND OLD.check_in_time = NEW.check_in_time) THEN
    RETURN NEW;
  END IF;

  -- Get admin settings for automatic overtime detection
  SELECT 
    enable_auto_overtime_checkin,
    auto_overtime_tolerance_minutes
  INTO v_admin_settings
  FROM public.admin_settings
  WHERE admin_id = (
    SELECT id FROM public.profiles 
    WHERE role = 'admin' 
    LIMIT 1
  )
  LIMIT 1;

  -- If feature is disabled, skip
  IF v_admin_settings.enable_auto_overtime_checkin IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Get employee's work schedule
  SELECT 
    ews.start_time as work_start_time,
    ews.end_time as work_end_time
  INTO v_work_schedule
  FROM public.employee_work_schedules ews
  WHERE ews.employee_id = NEW.user_id
    AND ews.is_active = true
  LIMIT 1;

  -- If no work schedule found, skip
  IF v_work_schedule.work_start_time IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extract time from check_in_time
  v_check_in_time := NEW.check_in_time::TIME;
  v_work_start_time := v_work_schedule.work_start_time;

  -- Calculate difference in minutes
  v_diff_minutes := EXTRACT(EPOCH FROM (v_work_start_time - v_check_in_time)) / 60;

  -- If difference is greater than tolerance, create overtime record
  IF v_diff_minutes > COALESCE(v_admin_settings.auto_overtime_tolerance_minutes, 15) THEN
    
    -- Check if automatic overtime already exists for this date
    SELECT COUNT(*)
    INTO v_existing_overtime
    FROM public.overtime_records
    WHERE user_id = NEW.user_id
      AND date = NEW.date
      AND is_automatic = true
      AND overtime_type = 'automatic_checkin';

    -- Only create if doesn't exist
    IF v_existing_overtime = 0 THEN
      INSERT INTO public.overtime_records (
        user_id,
        date,
        hours,
        reason,
        overtime_type,
        is_automatic,
        calculated_minutes,
        approval_status,
        created_at,
        updated_at
      ) VALUES (
        NEW.user_id,
        NEW.date,
        ROUND(v_diff_minutes / 60.0, 2),
        'Straordinario automatico: check-in anticipato alle ' || 
          TO_CHAR(v_check_in_time, 'HH24:MI') || 
          ' (orario previsto: ' || 
          TO_CHAR(v_work_start_time, 'HH24:MI') || ')',
        'automatic_checkin',
        true,
        v_diff_minutes::INTEGER,
        'pending',
        NOW(),
        NOW()
      );

      RAISE NOTICE 'Automatic overtime created: % minutes for user % on %', 
        v_diff_minutes, NEW.user_id, NEW.date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.calculate_automatic_overtime_checkin() IS 
  'Automatically calculates and records overtime when employee checks in early';

-- =====================================================
-- 4. CREATE TRIGGER FOR AUTOMATIC OVERTIME DETECTION
-- =====================================================

DROP TRIGGER IF EXISTS trigger_automatic_overtime_checkin ON public.attendances;

CREATE TRIGGER trigger_automatic_overtime_checkin
  AFTER INSERT OR UPDATE OF check_in_time ON public.attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_automatic_overtime_checkin();

COMMENT ON TRIGGER trigger_automatic_overtime_checkin ON public.attendances IS 
  'Triggers automatic overtime calculation on check-in';

-- =====================================================
-- 5. FUNCTION TO CHECK FOR EXISTING AUTOMATIC OVERTIME
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_automatic_overtime_for_date(
  p_user_id UUID,
  p_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.overtime_records
  WHERE user_id = p_user_id
    AND date = p_date
    AND is_automatic = true;

  RETURN v_count > 0;
END;
$$;

COMMENT ON FUNCTION public.has_automatic_overtime_for_date(UUID, DATE) IS 
  'Check if automatic overtime exists for a specific user and date';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.has_automatic_overtime_for_date(UUID, DATE) TO authenticated;

-- =====================================================
-- 6. FUNCTION TO GET BLOCKED DATES FOR MANUAL ENTRY
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_blocked_overtime_dates(
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(blocked_date DATE, overtime_id UUID, calculated_minutes INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date as blocked_date,
    id as overtime_id,
    calculated_minutes
  FROM public.overtime_records
  WHERE user_id = p_user_id
    AND is_automatic = true
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date)
  ORDER BY date DESC;
END;
$$;

COMMENT ON FUNCTION public.get_blocked_overtime_dates(UUID, DATE, DATE) IS 
  'Get dates that are blocked for manual overtime entry due to automatic records';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_blocked_overtime_dates(UUID, DATE, DATE) TO authenticated;

-- =====================================================
-- 7. ADD RLS POLICY FOR OVERTIME APPROVAL
-- =====================================================

-- Allow users to view their own automatic overtime
-- (existing policies already cover this, but we ensure it's clear)

-- Allow admins to approve/reject automatic overtime
-- Note: DROP first to avoid conflicts with existing policies
DROP POLICY IF EXISTS "overtime_records_admin_approve_policy" ON public.overtime_records;

CREATE POLICY "overtime_records_admin_approve_policy" ON public.overtime_records
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- =====================================================
-- 8. CREATE VIEW FOR OVERTIME SUMMARY
-- =====================================================

CREATE OR REPLACE VIEW public.overtime_summary AS
SELECT 
  or_rec.user_id,
  CONCAT(p.first_name, ' ', p.last_name) as full_name,
  p.email,
  or_rec.date,
  or_rec.hours,
  or_rec.calculated_minutes,
  or_rec.overtime_type,
  or_rec.is_automatic,
  or_rec.approval_status,
  or_rec.reason,
  or_rec.created_at,
  CASE 
    WHEN or_rec.overtime_type = 'automatic_checkin' THEN 'Check-in anticipato'
    WHEN or_rec.overtime_type = 'automatic_checkout' THEN 'Check-out posticipato'
    ELSE 'Manuale'
  END as tipo_descrizione
FROM public.overtime_records or_rec
JOIN public.profiles p ON or_rec.user_id = p.id
ORDER BY or_rec.date DESC, or_rec.created_at DESC;

COMMENT ON VIEW public.overtime_summary IS 
  'Summary view of all overtime records with user details';

-- Grant access to the view
GRANT SELECT ON public.overtime_summary TO authenticated;

-- Add RLS to the view (inherits from base tables)
ALTER VIEW public.overtime_summary SET (security_invoker = true);

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check admin settings columns
/*
SELECT 
  admin_id,
  enable_auto_overtime_checkin,
  auto_overtime_tolerance_minutes
FROM public.admin_settings;
*/

-- Check overtime records structure
/*
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'overtime_records'
ORDER BY ordinal_position;
*/

-- Test automatic overtime detection (after check-in)
/*
SELECT * FROM public.overtime_summary
WHERE is_automatic = true
ORDER BY date DESC
LIMIT 10;
*/

