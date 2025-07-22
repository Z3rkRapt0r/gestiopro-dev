-- Add category column to notifications table to store original topic
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Update the constraint to include the new possible category values
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('document', 'system', 'message', 'announcement', 'Aggiornamenti aziendali', 'Comunicazioni importanti', 'Eventi', 'Avvisi sicurezza'));

-- Add constraint for category values
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_category_check 
CHECK (category IS NULL OR category IN ('Aggiornamenti aziendali', 'Comunicazioni importanti', 'Eventi', 'Avvisi sicurezza', 'system', 'document'));