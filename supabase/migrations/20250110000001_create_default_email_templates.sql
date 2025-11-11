-- Create default email templates for all notification types
-- This replaces all hardcoded templates in Edge Functions

-- Insert default templates for each admin (only if they don't exist)
INSERT INTO email_templates (
  admin_id,
  template_type,
  template_category,
  name,
  subject,
  content,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  footer_text,
  footer_color,
  logo_url,
  logo_alignment,
  logo_size,
  text_alignment,
  font_family,
  button_color,
  button_text_color,
  border_radius
)
SELECT 
  p.id as admin_id,
  template_type,
  template_category,
  template_name,
  template_subject,
  template_content,
  '#007bff' as primary_color,
  '#6c757d' as secondary_color,
  '#ffffff' as background_color,
  '#333333' as text_color,
  '© A.L.M Infissi - Sistema di Gestione Aziendale' as footer_text,
  '#888888' as footer_color,
  NULL as logo_url,
  'center' as logo_alignment,
  'medium' as logo_size,
  'left' as text_alignment,
  'Arial, sans-serif' as font_family,
  '#007bff' as button_color,
  '#ffffff' as button_text_color,
  '6px' as border_radius
FROM profiles p
CROSS JOIN (
  VALUES 
    -- Leave Request Templates (for admins)
    ('permessi-richiesta', 'amministratori', 'Richiesta Permesso', '📋 Nuova richiesta permesso da {employeeName}', 
     '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📋 Nuova Richiesta Permesso</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Gentile Amministratore,<br><br>
            È stata ricevuta una nuova richiesta di permesso da <strong>{employeeName}</strong>.
          </p>
          <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">📅 Dettagli Richiesta</h3>
            <div style="font-size: 14px; white-space: pre-line;">{leaveDetails}</div>
          </div>
          {{#if employeeNote}}
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #856404;">💬 Note del Dipendente</h3>
            <div style="font-size: 14px; white-space: pre-line;">{employeeNote}</div>
          </div>
          {{/if}}
        </div>
        <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
          {footerText}
        </div>
      </div>'),

    ('ferie-richiesta', 'amministratori', 'Richiesta Ferie', '📋 Nuova richiesta ferie da {employeeName}', 
     '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📋 Nuova Richiesta Ferie</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Gentile Amministratore,<br><br>
            È stata ricevuta una nuova richiesta di ferie da <strong>{employeeName}</strong>.
          </p>
          <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">📅 Dettagli Richiesta</h3>
            <div style="font-size: 14px; white-space: pre-line;">{leaveDetails}</div>
          </div>
          {{#if employeeNote}}
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #856404;">💬 Note del Dipendente</h3>
            <div style="font-size: 14px; white-space: pre-line;">{employeeNote}</div>
          </div>
          {{/if}}
        </div>
        <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
          {footerText}
        </div>
      </div>'),

    -- Leave Approval Templates (for employees)
    ('permessi-approvazione', 'dipendenti', 'Permesso Approvato', '✅ Richiesta permesso approvata', 
     '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">✅ Richiesta Approvata</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Caro/a <strong>{employeeName}</strong>,<br><br>
            La tua richiesta di permesso è stata <strong style="color: #28a745;">APPROVATA</strong>.
          </p>
          <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">📅 Dettagli Richiesta</h3>
            <div style="font-size: 14px; white-space: pre-line;">{leaveDetails}</div>
          </div>
          {{#if adminNote}}
          <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #155724;">💬 Note dell''Amministratore</h3>
            <div style="font-size: 14px; white-space: pre-line;">{adminNote}</div>
          </div>
          {{/if}}
        </div>
        <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
          {footerText}
        </div>
      </div>'),

    ('ferie-approvazione', 'dipendenti', 'Ferie Approvate', '✅ Richiesta ferie approvata', 
     '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">✅ Richiesta Approvata</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Caro/a <strong>{employeeName}</strong>,<br><br>
            La tua richiesta di ferie è stata <strong style="color: #28a745;">APPROVATA</strong>.
          </p>
          <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">📅 Dettagli Richiesta</h3>
            <div style="font-size: 14px; white-space: pre-line;">{leaveDetails}</div>
          </div>
          {{#if adminNote}}
          <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #155724;">💬 Note dell''Amministratore</h3>
            <div style="font-size: 14px; white-space: pre-line;">{adminNote}</div>
          </div>
          {{/if}}
        </div>
        <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
          {footerText}
        </div>
      </div>'),

    -- Leave Rejection Templates (for employees)
    ('permessi-rifiuto', 'dipendenti', 'Permesso Rifiutato', '❌ Richiesta permesso rifiutata', 
     '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">❌ Richiesta Rifiutata</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Caro/a <strong>{employeeName}</strong>,<br><br>
            La tua richiesta di permesso è stata <strong style="color: #dc3545;">RIFIUTATA</strong>.
          </p>
          <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">📅 Dettagli Richiesta</h3>
            <div style="font-size: 14px; white-space: pre-line;">{leaveDetails}</div>
          </div>
          {{#if adminNote}}
          <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #721c24;">💬 Motivo del Rifiuto</h3>
            <div style="font-size: 14px; white-space: pre-line;">{adminNote}</div>
          </div>
          {{/if}}
          <p style="font-size: 14px; color: #6c757d; margin-top: 20px;">
            Per ulteriori chiarimenti, contatta l''amministrazione.
          </p>
        </div>
        <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
          {footerText}
        </div>
      </div>'),

    ('ferie-rifiuto', 'dipendenti', 'Ferie Rifiutate', '❌ Richiesta ferie rifiutata', 
     '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">❌ Richiesta Rifiutata</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Caro/a <strong>{employeeName}</strong>,<br><br>
            La tua richiesta di ferie è stata <strong style="color: #dc3545;">RIFIUTATA</strong>.
          </p>
          <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">📅 Dettagli Richiesta</h3>
            <div style="font-size: 14px; white-space: pre-line;">{leaveDetails}</div>
          </div>
          {{#if adminNote}}
          <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #721c24;">💬 Motivo del Rifiuto</h3>
            <div style="font-size: 14px; white-space: pre-line;">{adminNote}</div>
          </div>
          {{/if}}
          <p style="font-size: 14px; color: #6c757d; margin-top: 20px;">
            Per ulteriori chiarimenti, contatta l''amministrazione.
          </p>
        </div>
        <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
          {footerText}
        </div>
      </div>'),

    -- Employee Message Templates
    ('employee-message', 'amministratori', 'Messaggio Dipendente', '💬 Messaggio da {employeeName}', 
     '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">💬 Nuovo Messaggio</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Gentile Amministratore,<br><br>
            Hai ricevuto un nuovo messaggio da <strong>{employeeName}</strong>.
          </p>
          <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">📝 Oggetto</h3>
            <div style="font-size: 16px; font-weight: bold;">{messageTitle}</div>
          </div>
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #856404;">💬 Messaggio</h3>
            <div style="font-size: 14px; white-space: pre-line;">{message}</div>
          </div>
        </div>
        <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
          {footerText}
        </div>
      </div>')

) AS templates(template_type, template_category, template_name, template_subject, template_content)
WHERE p.role IN ('admin', 'administrator')
ON CONFLICT (admin_id, template_type, template_category) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_templates_admin_type_category 
ON email_templates(admin_id, template_type, template_category);

-- Add comment
COMMENT ON TABLE email_templates IS 'Email templates for all notification types. Replaces hardcoded templates in Edge Functions.';
