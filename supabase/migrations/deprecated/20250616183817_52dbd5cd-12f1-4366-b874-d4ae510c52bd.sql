
ALTER TABLE email_templates 
ADD COLUMN details text,
ADD COLUMN show_details_button boolean DEFAULT true,
ADD COLUMN show_leave_details boolean DEFAULT true;
