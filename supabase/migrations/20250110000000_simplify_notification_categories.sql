-- Migration: Simplify notification categories to just "notifiche"
-- Date: 2025-01-10

-- First, drop existing constraint to allow updates
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_category_check;

-- Update all existing categories to "notifiche" (including NULL and invalid values)
UPDATE notifications 
SET category = 'notifiche' 
WHERE category IS NOT NULL AND category != 'notifiche';

-- Update NULL categories to "notifiche"
UPDATE notifications 
SET category = 'notifiche' 
WHERE category IS NULL;

-- Add new simplified constraint with only "notifiche"
ALTER TABLE notifications ADD CONSTRAINT notifications_category_check 
CHECK (category IN ('notifiche'));

-- Add comment
COMMENT ON CONSTRAINT notifications_category_check ON notifications IS 
'Simplified notification categories - only "notifiche" allowed';
