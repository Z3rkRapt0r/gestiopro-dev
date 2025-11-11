-- =====================================================
-- FIX PERFORMANCE ADVISOR SUGGESTIONS (INFO LEVEL)
-- =====================================================
-- These are optimization suggestions that can improve
-- database performance but are not critical warnings.
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- =====================================================
-- Foreign keys without indexes can cause slow JOINs and
-- cascading operations. Adding indexes improves query performance.
-- =====================================================

-- attendance_alerts.admin_id
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_admin_id 
  ON public.attendance_alerts(admin_id);

-- attendances.business_trip_id
CREATE INDEX IF NOT EXISTS idx_attendances_business_trip_id 
  ON public.attendances(business_trip_id);

-- documents.uploaded_by
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by 
  ON public.documents(uploaded_by);

-- documents.user_id
CREATE INDEX IF NOT EXISTS idx_documents_user_id 
  ON public.documents(user_id);

-- employee_leave_balance.created_by
CREATE INDEX IF NOT EXISTS idx_employee_leave_balance_created_by 
  ON public.employee_leave_balance(created_by);

-- leave_requests.leave_balance_id
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_balance_id 
  ON public.leave_requests(leave_balance_id);

-- leave_requests.reviewed_by
CREATE INDEX IF NOT EXISTS idx_leave_requests_reviewed_by 
  ON public.leave_requests(reviewed_by);

-- notifications.created_by
CREATE INDEX IF NOT EXISTS idx_notifications_created_by 
  ON public.notifications(created_by);

-- notifications.user_id
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
  ON public.notifications(user_id);

-- overtime_records.user_id
CREATE INDEX IF NOT EXISTS idx_overtime_records_user_id 
  ON public.overtime_records(user_id);

-- sick_leaves.created_by
CREATE INDEX IF NOT EXISTS idx_sick_leaves_created_by 
  ON public.sick_leaves(created_by);

-- =====================================================
-- 2. ADD PRIMARY KEY TO edge_response
-- =====================================================
-- Tables without primary keys are inefficient at scale.
-- Note: This assumes the table structure allows for it.
-- If the table is meant to be a simple key-value store,
-- we can add a composite primary key or a surrogate key.
-- =====================================================

-- Check if edge_response table exists and what columns it has
DO $$
BEGIN
  -- Option 1: If there's a unique identifier column, use it
  -- Option 2: Add a surrogate key (id)
  -- Option 3: Use a composite key if appropriate
  
  -- First, check if the table already has a primary key
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'public.edge_response'::regclass 
    AND contype = 'p'
  ) THEN
    -- Add a serial primary key if no primary key exists
    -- Adjust this based on your table structure
    ALTER TABLE public.edge_response 
      ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY;
    
    RAISE NOTICE 'Added primary key to edge_response table';
  ELSE
    RAISE NOTICE 'edge_response table already has a primary key';
  END IF;
END $$;

-- =====================================================
-- 3. REMOVE UNUSED INDEXES
-- =====================================================
-- Unused indexes consume disk space and slow down writes
-- (INSERT, UPDATE, DELETE) without providing query benefits.
-- Only remove if you're certain they won't be needed.
-- =====================================================

-- IMPORTANT: Before dropping these indexes, verify they are truly unused
-- in your production environment. The linter may report them as unused
-- if they haven't been used since the last statistics reset.

-- Uncomment the following lines ONLY if you're certain these indexes
-- are not needed. Otherwise, monitor them for a longer period.

/*
-- attendance_alerts indexes
DROP INDEX IF EXISTS public.idx_attendance_alerts_date;
DROP INDEX IF EXISTS public.idx_attendance_alerts_employee;

-- company_holidays indexes
DROP INDEX IF EXISTS public.idx_company_holidays_admin_id;
DROP INDEX IF EXISTS public.idx_company_holidays_recurring;

-- email_templates indexes
DROP INDEX IF EXISTS public.idx_email_templates_admin_type;

-- multiple_checkins indexes
DROP INDEX IF EXISTS public.idx_multiple_checkins_permission;

-- profiles indexes
DROP INDEX IF EXISTS public.idx_profiles_first_login;

-- unified_attendances indexes
DROP INDEX IF EXISTS public.idx_unified_attendances_sick_leave;
*/

-- =====================================================
-- ALTERNATIVE: CONDITIONAL INDEX REMOVAL
-- =====================================================
-- If you want to be more conservative, you can keep the indexes
-- but document them for future review. Here's a query to monitor
-- index usage over time:
-- =====================================================

-- Run this query periodically to check index usage:
/*
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- Never used
ORDER BY pg_relation_size(indexrelid) DESC;
*/

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- 1. Check all foreign keys now have indexes:
/*
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = tc.table_name 
        AND indexdef LIKE '%' || kcu.column_name || '%'
    ) THEN 'INDEXED ✓'
    ELSE 'MISSING INDEX ✗'
  END as index_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
*/

-- 2. Check tables without primary keys:
/*
SELECT 
  t.table_name
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints tc 
  ON t.table_name = tc.table_name 
  AND tc.constraint_type = 'PRIMARY KEY'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND tc.constraint_name IS NULL
ORDER BY t.table_name;
*/

-- 3. List all unused indexes:
/*
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
*/


