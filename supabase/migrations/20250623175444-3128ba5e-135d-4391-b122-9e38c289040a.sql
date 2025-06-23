
-- Add hire_date column to profiles if not exists (for tracking when employee was created)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS hire_date date DEFAULT CURRENT_DATE;

-- Update existing profiles to have hire_date set to creation date if null
UPDATE profiles 
SET hire_date = created_at::date 
WHERE hire_date IS NULL;

-- Create a view for upcoming leaves to make queries easier
CREATE OR REPLACE VIEW upcoming_leaves AS
SELECT 
  lr.*,
  p.first_name,
  p.last_name,
  p.email,
  CASE 
    WHEN lr.type = 'ferie' THEN lr.date_from
    WHEN lr.type = 'permesso' THEN lr.day
  END as start_date,
  CASE 
    WHEN lr.type = 'ferie' THEN lr.date_to
    WHEN lr.type = 'permesso' THEN lr.day
  END as end_date
FROM leave_requests lr
JOIN profiles p ON lr.user_id = p.id
WHERE lr.status = 'approved'
  AND (
    (lr.type = 'ferie' AND lr.date_from >= CURRENT_DATE)
    OR 
    (lr.type = 'permesso' AND lr.day >= CURRENT_DATE)
  );

-- Create function to get upcoming leaves within a date range
CREATE OR REPLACE FUNCTION get_upcoming_leaves(days_ahead integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  type text,
  start_date date,
  end_date date,
  first_name text,
  last_name text,
  email text,
  note text,
  days_until integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.id,
    ul.user_id,
    ul.type,
    ul.start_date,
    ul.end_date,
    ul.first_name,
    ul.last_name,
    ul.email,
    ul.note,
    (ul.start_date - CURRENT_DATE)::integer as days_until
  FROM upcoming_leaves ul
  WHERE ul.start_date <= CURRENT_DATE + INTERVAL '1 day' * days_ahead
  ORDER BY ul.start_date ASC, ul.first_name ASC;
END;
$$;
