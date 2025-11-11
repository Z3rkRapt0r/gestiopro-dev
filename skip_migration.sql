-- Temporarily disable constraint to allow migration
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS check_template_type;
