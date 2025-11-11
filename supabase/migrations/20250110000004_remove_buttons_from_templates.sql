-- Remove buttons from all email templates
-- This migration removes all button-related HTML from existing templates

UPDATE email_templates
SET 
  content = REGEXP_REPLACE(
    content, 
    '<div[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>[\s\S]*?<a[^>]*>[\s\S]*?<\/a>[\s\S]*?<\/div>', 
    '', 
    'g'
  )
WHERE content LIKE '%<a%href%>%</a>%';

-- Also remove any button-related styling variables from templates
UPDATE email_templates
SET 
  content = REGEXP_REPLACE(
    content, 
    '\{buttonColor\}|\{buttonTextColor\}|\{buttonText\}|\{buttonUrl\}', 
    '', 
    'g'
  )
WHERE content LIKE '%{button%';

-- Remove button configuration from template settings (if they exist)
-- Note: These columns might not exist in all schemas
DO $$
BEGIN
  -- Try to remove button-related columns if they exist
  BEGIN
    ALTER TABLE email_templates DROP COLUMN IF EXISTS button_color;
    ALTER TABLE email_templates DROP COLUMN IF EXISTS button_text_color;
    ALTER TABLE email_templates DROP COLUMN IF EXISTS show_button;
    ALTER TABLE email_templates DROP COLUMN IF EXISTS button_text;
    ALTER TABLE email_templates DROP COLUMN IF EXISTS button_url;
    ALTER TABLE email_templates DROP COLUMN IF EXISTS border_radius;
  EXCEPTION
    WHEN undefined_column THEN
      -- Columns don't exist, which is fine
      NULL;
  END;
END $$;

-- Add comment
COMMENT ON TABLE email_templates IS 'Email templates without button support - buttons removed from all templates';



