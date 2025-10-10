-- Migration: Simplify notification categories to just "notifiche"
-- Date: 2025-01-10

-- Update all existing categories to "notifiche"
UPDATE notifications 
SET category = 'notifiche' 
WHERE category IS NOT NULL;

-- Drop existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_category_check;

-- Add new simplified constraint with only "notifiche"
ALTER TABLE notifications ADD CONSTRAINT notifications_category_check 
CHECK (category IN ('notifiche'));

-- Add comment
COMMENT ON CONSTRAINT notifications_category_check ON notifications IS 
'Simplified notification categories - only "notifiche" allowed';
