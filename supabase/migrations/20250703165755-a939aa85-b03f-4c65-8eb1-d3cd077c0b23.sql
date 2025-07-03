-- Add reference_code column to sick_leaves table
ALTER TABLE public.sick_leaves 
ADD COLUMN reference_code TEXT;

-- Create function to generate MAL reference codes
CREATE OR REPLACE FUNCTION generate_sick_leave_reference_code()
RETURNS TEXT AS $$
DECLARE
    date_part TEXT;
    counter INTEGER;
    reference_code TEXT;
BEGIN
    -- Get current date in YYYYMMDD format
    date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Get the count of sick leaves created today
    SELECT COUNT(*) + 1 INTO counter
    FROM sick_leaves 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Format: MAL-YYYYMMDD-NNNNNN (6 digits with leading zeros)
    reference_code := 'MAL-' || date_part || '-' || LPAD(counter::TEXT, 6, '0');
    
    RETURN reference_code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-generate reference codes
CREATE OR REPLACE FUNCTION auto_generate_sick_leave_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if reference_code is not already set
    IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
        NEW.reference_code := generate_sick_leave_reference_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate reference codes on insert
CREATE TRIGGER trigger_auto_generate_sick_leave_reference
    BEFORE INSERT ON public.sick_leaves
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_sick_leave_reference();

-- Update existing sick leaves to have reference codes
DO $$
DECLARE
    sick_leave_record RECORD;
    new_code TEXT;
    counter INTEGER := 1;
BEGIN
    FOR sick_leave_record IN 
        SELECT id, created_at 
        FROM sick_leaves 
        WHERE reference_code IS NULL 
        ORDER BY created_at ASC
    LOOP
        -- Generate reference code based on creation date
        new_code := 'MAL-' || TO_CHAR(sick_leave_record.created_at, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 6, '0');
        
        UPDATE sick_leaves 
        SET reference_code = new_code 
        WHERE id = sick_leave_record.id;
        
        counter := counter + 1;
    END LOOP;
END $$;