-- Update existing email templates to use single brace syntax instead of double brace
-- This fixes the JavaScript ReferenceError: employeeName is not defined

-- Update subject fields
UPDATE email_templates 
SET subject = REPLACE(subject, '{{employeeName}}', '{employeeName}')
WHERE subject LIKE '%{{employeeName}}%';

UPDATE email_templates 
SET subject = REPLACE(subject, '{{leaveDetails}}', '{leaveDetails}')
WHERE subject LIKE '%{{leaveDetails}}%';

UPDATE email_templates 
SET subject = REPLACE(subject, '{{messageTitle}}', '{messageTitle}')
WHERE subject LIKE '%{{messageTitle}}%';

-- Update content fields
UPDATE email_templates 
SET content = REPLACE(content, '{{employeeName}}', '{employeeName}')
WHERE content LIKE '%{{employeeName}}%';

UPDATE email_templates 
SET content = REPLACE(content, '{{leaveDetails}}', '{leaveDetails}')
WHERE content LIKE '%{{leaveDetails}}%';

UPDATE email_templates 
SET content = REPLACE(content, '{{employeeNote}}', '{employeeNote}')
WHERE content LIKE '%{{employeeNote}}%';

UPDATE email_templates 
SET content = REPLACE(content, '{{adminNote}}', '{adminNote}')
WHERE content LIKE '%{{adminNote}}%';

UPDATE email_templates 
SET content = REPLACE(content, '{{messageTitle}}', '{messageTitle}')
WHERE content LIKE '%{{messageTitle}}%';

UPDATE email_templates 
SET content = REPLACE(content, '{{message}}', '{message}')
WHERE content LIKE '%{{message}}%';

UPDATE email_templates 
SET content = REPLACE(content, '{{footerText}}', '{footerText}')
WHERE content LIKE '%{{footerText}}%';

UPDATE email_templates 
SET content = REPLACE(content, '{{primaryColor}}', '{primaryColor}')
WHERE content LIKE '%{{primaryColor}}%';

UPDATE email_templates 
SET content = REPLACE(content, '{{secondaryColor}}', '{secondaryColor}')
WHERE content LIKE '%{{secondaryColor}}%';

UPDATE email_templates 
SET content = REPLACE(content, '{{backgroundColor}}', '{backgroundColor}')
WHERE content LIKE '%{{backgroundColor}}%';

UPDATE email_templates 
SET content = REPLACE(content, '{{textColor}}', '{textColor}')
WHERE content LIKE '%{{textColor}}%';

UPDATE email_templates 
SET content = REPLACE(content, '{{footerColor}}', '{footerColor}')
WHERE content LIKE '%{{footerColor}}%';

UPDATE email_templates 
SET content = REPLACE(content, '{{fontFamily}}', '{fontFamily}')
WHERE content LIKE '%{{fontFamily}}%';

-- Add comment
COMMENT ON TABLE email_templates IS 'Email templates updated to use single brace variable syntax to fix JavaScript ReferenceError';



