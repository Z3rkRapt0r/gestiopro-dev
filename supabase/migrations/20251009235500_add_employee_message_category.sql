-- Migration: Add employee_message to notifications category constraint
-- Date: 2025-10-09

-- First, update any invalid categories to 'system'
UPDATE notifications 
SET category = 'system' 
WHERE category NOT IN (
  'system',
  'announcement',
  'document',
  'leave_request',
  'leave_approval',
  'leave_rejection',
  'attendance',
  'payroll',
  'generale'
) AND category IS NOT NULL;

-- Set NULL categories to 'system'
UPDATE notifications 
SET category = 'system' 
WHERE category IS NULL;

-- Drop existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_category_check;

-- Add new constraint with employee_message included
ALTER TABLE notifications ADD CONSTRAINT notifications_category_check 
CHECK (category IN (
  'system',
  'announcement',
  'document',
  'leave_request',
  'leave_approval',
  'leave_rejection',
  'attendance',
  'payroll',
  'generale',
  'employee_message'
));

-- Add comment
COMMENT ON CONSTRAINT notifications_category_check ON notifications IS 
'Valid notification categories including employee messages to admin';

