-- Query per verificare le colonne delle tabelle problematiche
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'employee_leave_balance',
    'employee_work_schedules',
    'attendance_alerts',
    'sent_notifications',
    'overtime_records',
    'sick_leaves',
    'working_days_tracking',
    'company_holidays',
    'employee_logo_settings',
    'login_settings',
    'dashboard_settings',
    'business_trips',
    'multiple_checkins',
    'unified_attendances'
  )
ORDER BY table_name, ordinal_position;
