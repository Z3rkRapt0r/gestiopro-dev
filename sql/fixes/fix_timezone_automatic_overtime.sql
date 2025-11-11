-- =====================================================
-- FIX TIMEZONE ISSUE IN AUTOMATIC OVERTIME DETECTION
-- =====================================================
-- Fixes the timezone conversion issue in the automatic
-- overtime detection function. The check_in_time is stored
-- in UTC but needs to be converted to Europe/Rome timezone
-- before being displayed in the overtime message.
-- =====================================================

BEGIN;

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS trigger_automatic_overtime_checkin ON public.attendances;
DROP FUNCTION IF EXISTS public.calculate_automatic_overtime_checkin() CASCADE;

-- Recreate function with proper timezone conversion
CREATE OR REPLACE FUNCTION public.calculate_automatic_overtime_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_settings RECORD;
  v_work_schedule RECORD;
  v_check_in_time TIME;
  v_check_in_time_local TIMESTAMPTZ;
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
    AND (ews.is_active IS NULL OR ews.is_active = true)
  LIMIT 1;

  -- If no work schedule found, skip
  IF v_work_schedule.work_start_time IS NULL THEN
    RETURN NEW;
  END IF;

  -- 🔧 FIX: Convert check_in_time from UTC to Europe/Rome timezone
  v_check_in_time_local := NEW.check_in_time AT TIME ZONE 'Europe/Rome';
  v_check_in_time := v_check_in_time_local::TIME;
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
        created_by,
        created_at,
        updated_at
      ) VALUES (
        NEW.user_id,
        NEW.date,
        CEIL(v_diff_minutes / 60.0)::INTEGER,  -- Round up to next full hour
        -- 🔧 FIX: Now uses the correctly converted local time
        'Straordinario automatico: check-in anticipato alle ' ||
          TO_CHAR(v_check_in_time, 'HH24:MI') ||
          ' (orario previsto: ' ||
          TO_CHAR(v_work_start_time, 'HH24:MI') || ')',
        'automatic_checkin',
        true,
        v_diff_minutes::INTEGER,
        'pending',
        NEW.user_id,  -- created_by is the user themselves for automatic overtimes
        NOW(),
        NOW()
      );

      RAISE NOTICE 'Automatic overtime created: % minutes for user % on % (local time: %)',
        v_diff_minutes, NEW.user_id, NEW.date, v_check_in_time;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.calculate_automatic_overtime_checkin() IS
  'Automatically calculates and records overtime when employee checks in early. Now properly handles timezone conversion from UTC to Europe/Rome.';

-- Recreate trigger
CREATE TRIGGER trigger_automatic_overtime_checkin
  AFTER INSERT OR UPDATE OF check_in_time ON public.attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_automatic_overtime_checkin();

COMMENT ON TRIGGER trigger_automatic_overtime_checkin ON public.attendances IS
  'Triggers automatic overtime calculation on check-in with proper timezone handling';

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test: Check if timezone conversion is working
DO $$
DECLARE
  test_time TIMESTAMPTZ := '2025-01-10 08:00:00+00'::TIMESTAMPTZ; -- 8:00 AM UTC
  local_time TIME;
BEGIN
  -- Convert to Europe/Rome (should be 09:00)
  local_time := (test_time AT TIME ZONE 'Europe/Rome')::TIME;

  RAISE NOTICE 'Test timezone conversion:';
  RAISE NOTICE 'UTC time: %', test_time;
  RAISE NOTICE 'Local time (Europe/Rome): %', local_time;
  RAISE NOTICE 'Expected: 09:00:00 (for UTC+1) or 10:00:00 (for UTC+2 during DST)';
END $$;

SELECT 'Timezone fix applied successfully! Check-in times will now display in Europe/Rome timezone.' as status;
