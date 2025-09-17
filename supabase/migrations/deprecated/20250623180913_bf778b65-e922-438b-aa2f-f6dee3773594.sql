
-- Add tracking_start_type field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tracking_start_type text DEFAULT 'from_hire_date' 
CHECK (tracking_start_type IN ('from_hire_date', 'from_year_start'));

-- Add comment to explain the field
COMMENT ON COLUMN profiles.tracking_start_type IS 'Tipo di inizio conteggio giorni lavorativi: from_hire_date per nuovi assunti, from_year_start per dipendenti esistenti';
