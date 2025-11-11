-- Update all email templates to remove buttons and use clean HTML without button elements
-- This replaces the previous templates with button-free versions

-- Update document templates
UPDATE email_templates
SET 
  subject = 'Nuovo Documento Disponibile',
  content = 'Gentile {employeeName},<br><br>È disponibile un nuovo documento per te. Il documento contiene informazioni importanti che richiedono la tua attenzione.<br><br>Accedi alla dashboard per visualizzare il documento.'
WHERE template_type = 'documenti' AND template_category = 'amministratori';

UPDATE email_templates
SET 
  subject = 'Nuovo Documento da {employeeName}',
  content = 'È disponibile un nuovo documento caricato da {employeeName} per la tua revisione.<br><br>Note del dipendente:<br>{employeeNote}<br><br>Il documento contiene informazioni che richiedono la tua attenzione.'
WHERE template_type = 'documenti' AND template_category = 'dipendenti';

-- Update notification templates
UPDATE email_templates
SET 
  subject = 'Nuova Notifica dall''Amministrazione',
  content = 'Gentile {employeeName},<br><br>Hai ricevuto una nuova notifica dall''amministrazione.<br><br>{message}<br><br>Accedi alla dashboard per maggiori dettagli.'
WHERE template_type = 'notifiche' AND template_category = 'amministratori';

UPDATE email_templates
SET 
  subject = 'Nuova Notifica da {employeeName}',
  content = 'Hai ricevuto una nuova notifica da {employeeName}.<br><br>{message}<br><br>Accedi alla dashboard per maggiori dettagli.'
WHERE template_type = 'notifiche' AND template_category = 'dipendenti';

-- Update attendance alert templates
UPDATE email_templates
SET 
  subject = 'Promemoria: Registrazione Entrata Mancante',
  content = 'Gentile {employeeName},<br><br>Notiamo che non hai ancora registrato la tua entrata per oggi.<br><br>Orario previsto: {expectedTime}<br>Orario attuale: {currentTime}<br><br>Ti ricordiamo di registrare la tua presenza il prima possibile.<br><br>Grazie per la collaborazione.'
WHERE template_type = 'promemoria-presenza' AND template_category = 'amministratori';

-- Update leave request templates (clean HTML without buttons)
UPDATE email_templates
SET 
  subject = '📋 Nuova richiesta permesso da {employeeName}',
  content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
      {#if employeeNote}
      <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #856404;">💬 Note del Dipendente</h3>
        <div style="font-size: 14px; white-space: pre-line;">{employeeNote}</div>
      </div>
      {/if}
    </div>
    <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
      {footerText}
    </div>
  </div>'
WHERE template_type = 'permessi-richiesta' AND template_category = 'amministratori';

UPDATE email_templates
SET 
  subject = '📋 Nuova richiesta ferie da {employeeName}',
  content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
      {#if employeeNote}
      <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #856404;">💬 Note del Dipendente</h3>
        <div style="font-size: 14px; white-space: pre-line;">{employeeNote}</div>
      </div>
      {/if}
    </div>
    <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
      {footerText}
    </div>
  </div>'
WHERE template_type = 'ferie-richiesta' AND template_category = 'amministratori';

-- Update approval templates (clean HTML without buttons)
UPDATE email_templates
SET 
  subject = '✅ Richiesta permesso approvata',
  content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
      {#if adminNote}
      <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin-bottom: 20px; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #155724;">💬 Note dell''Amministratore</h3>
        <div style="font-size: 14px; white-space: pre-line;">{adminNote}</div>
      </div>
      {/if}
    </div>
    <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
      {footerText}
    </div>
  </div>'
WHERE template_type = 'permessi-approvazione' AND template_category = 'dipendenti';

UPDATE email_templates
SET 
  subject = '✅ Richiesta ferie approvata',
  content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
      {#if adminNote}
      <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin-bottom: 20px; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #155724;">💬 Note dell''Amministratore</h3>
        <div style="font-size: 14px; white-space: pre-line;">{adminNote}</div>
      </div>
      {/if}
    </div>
    <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
      {footerText}
    </div>
  </div>'
WHERE template_type = 'ferie-approvazione' AND template_category = 'dipendenti';

-- Update rejection templates (clean HTML without buttons)
UPDATE email_templates
SET 
  subject = '❌ Richiesta permesso rifiutata',
  content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
      {#if adminNote}
      <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin-bottom: 20px; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #721c24;">💬 Motivo del Rifiuto</h3>
        <div style="font-size: 14px; white-space: pre-line;">{adminNote}</div>
      </div>
      {/if}
      <p style="font-size: 14px; color: #6c757d; margin-top: 20px;">
        Per ulteriori chiarimenti, contatta l''amministrazione.
      </p>
    </div>
    <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
      {footerText}
    </div>
  </div>'
WHERE template_type = 'permessi-rifiuto' AND template_category = 'dipendenti';

UPDATE email_templates
SET 
  subject = '❌ Richiesta ferie rifiutata',
  content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
      {#if adminNote}
      <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin-bottom: 20px; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #721c24;">💬 Motivo del Rifiuto</h3>
        <div style="font-size: 14px; white-space: pre-line;">{adminNote}</div>
      </div>
      {/if}
      <p style="font-size: 14px; color: #6c757d; margin-top: 20px;">
        Per ulteriori chiarimenti, contatta l''amministrazione.
      </p>
    </div>
    <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
      {footerText}
    </div>
  </div>'
WHERE template_type = 'ferie-rifiuto' AND template_category = 'dipendenti';

-- Update employee message templates (clean HTML without buttons)
UPDATE email_templates
SET 
  subject = '💬 Messaggio da {employeeName}',
  content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
  </div>'
WHERE template_type = 'employee-message' AND template_category = 'amministratori';

-- Add comment
COMMENT ON TABLE email_templates IS 'Email templates updated - all buttons removed from templates';



