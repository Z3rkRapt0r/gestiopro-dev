
export interface EmailContentParams {
  subject: string;
  shortText: string;
  logoUrl: string | null;
  attachmentSection: string;
  senderEmail: string;
  isDocumentEmail?: boolean;
  templateType?: string;
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  logoAlignment?: string;
  footerText?: string;
  footerColor?: string;
  fontFamily?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  borderRadius?: string;
  logoSize?: string;
  headerAlignment?: string;
  bodyAlignment?: string;
  fontSize?: string;
  showDetailsButton?: boolean;
  showLeaveDetails?: boolean;
  showAdminNotes?: boolean;
  leaveDetails?: string;
  adminNotes?: string;
  employeeNotes?: string;
  leaveDetailsBgColor?: string;
  leaveDetailsTextColor?: string;
  adminNotesBgColor?: string;
  adminNotesTextColor?: string;
  showCustomBlock?: boolean;
  customBlockText?: string;
  customBlockBgColor?: string;
  customBlockTextColor?: string;
  dynamicSubject?: string;
  dynamicContent?: string;
}

export function buildAttachmentSection(attachmentUrl: string | null, primaryColor: string = '#007bff'): string {
  if (!attachmentUrl) {
    return '';
  }

  return `
    <div style="margin-top: 20px; padding: 15px; border: 1px solid ${primaryColor}; border-radius: 5px;">
      <h4>Allegato:</h4>
      <a href="${attachmentUrl}" style="color: ${primaryColor}; text-decoration: none;">
        Scarica l'allegato
      </a>
    </div>
  `;
}

export function buildHtmlContent({
  subject,
  shortText,
  logoUrl,
  attachmentSection,
  senderEmail,
  isDocumentEmail = false,
  templateType = 'notifiche',
  primaryColor = '#007bff',
  backgroundColor = '#ffffff',
  textColor = '#333333',
  logoAlignment = 'center',
  footerText = '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820',
  footerColor = '#888888',
  fontFamily = 'Arial, sans-serif',
  buttonColor = '#007bff',
  buttonTextColor = '#ffffff',
  borderRadius = '6px',
  logoSize = 'medium',
  headerAlignment = 'center',
  bodyAlignment = 'left',
  fontSize = 'medium',
  showDetailsButton = true,
  showLeaveDetails = true,
  showAdminNotes = true,
  leaveDetails = '',
  adminNotes = '',
  employeeNotes = '',
  leaveDetailsBgColor = '#e3f2fd',
  leaveDetailsTextColor = '#1565c0',
  adminNotesBgColor = '#f8f9fa',
  adminNotesTextColor = '#495057',
  showCustomBlock = false,
  customBlockText = '',
  customBlockBgColor = '#fff3cd',
  customBlockTextColor = '#856404',
  dynamicSubject = '',
  dynamicContent = '',
  employeeEmail = '' // New parameter for employee email
}: EmailContentParams & {
  employeeEmail?: string;
}) {
  // Determine font size in pixels
  const fontSizeMap: { [key: string]: string } = {
    'small': '14px',
    'medium': '16px',
    'large': '18px'
  };
  const actualFontSize = fontSizeMap[fontSize] || '16px';

  // Logo Section with global settings
  const logoSection = logoUrl
    ? `<div style="text-align:${logoAlignment};margin-bottom:24px;">
        <img src="${logoUrl}" alt="Logo" style="max-height:${logoSize === 'small' ? '40px' : logoSize === 'large' ? '80px' : '60px'};max-width:180px;" />
      </div>`
    : "";

  // Employee info section for admin notifications
  const employeeInfoSection = employeeEmail ? `
    <div style="background-color: #e8f4fd; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px;">
      <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">📧 Comunicazione da dipendente</h4>
      <p style="margin: 0; font-size: 14px; color: #2c5282;">
        <strong>Email dipendente:</strong> ${employeeEmail}<br>
        <span style="font-size: 12px; color: #64748b;">Puoi rispondere direttamente a questa email per contattare il dipendente</span>
      </p>
    </div>
  ` : "";

  // Custom Block Section
  const customBlockSection = showCustomBlock && customBlockText ? `
    <div style="background-color: ${customBlockBgColor}; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px; color: ${customBlockTextColor};">
      <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">📣 Avviso Importante</h4>
      <p style="margin: 0; font-size: 14px;">
        ${customBlockText}
      </p>
    </div>
  ` : "";

  // Determine final subject and content
  const finalSubject = dynamicSubject || subject;
  const finalContent = dynamicContent || shortText;

  // Leave Details Section
  const leaveDetailsSection = showLeaveDetails && leaveDetails ? `
    <div style="background-color: ${leaveDetailsBgColor}; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px; color: ${leaveDetailsTextColor};">
      <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">Dettagli Richiesta</h4>
      <p style="margin: 0; font-size: 14px;">
        ${leaveDetails.replace(/\n/g, '<br>')}
      </p>
    </div>
  ` : "";

  // Determine if this is an employee request (from employee to admin) or admin response (from admin to employee)
  const isEmployeeRequest = templateType.includes('richiesta');
  const isAdminResponse = templateType.includes('approvazione') || templateType.includes('rifiuto');

  // Employee Notes Section (for employee requests)
  const employeeNotesSection = showAdminNotes && isEmployeeRequest && employeeNotes ? `
    <div style="background-color: #e8f4fd; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px; color: #2c5282;">
      <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">💬 Note del Dipendente</h4>
      <p style="margin: 0; font-size: 14px;">
        ${employeeNotes.replace(/\n/g, '<br>')}
      </p>
    </div>
  ` : "";

  // Admin Notes Section (for admin responses)
  const adminNotesSection = showAdminNotes && isAdminResponse && adminNotes ? `
    <div style="background-color: ${adminNotesBgColor}; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px; color: ${adminNotesTextColor};">
      <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">📋 Note Amministratore</h4>
      <p style="margin: 0; font-size: 14px;">
        ${adminNotes.replace(/\n/g, '<br>')}
      </p>
    </div>
  ` : "";

  // Dashboard button for document and notification emails
  const dashboardButton = (isDocumentEmail && showDetailsButton) ? `
    <div style="width:100%;text-align:center;margin:28px 0 0 0;">
      <a href="https://alm-app.lovable.app/" target="_blank" style="
        background-color:${buttonColor};
        color:${buttonTextColor};
        padding:12px 26px;
        border-radius:${borderRadius};
        text-decoration:none;
        font-size:16px;
        font-weight:bold;
        letter-spacing:0.5px;
        display:inline-block;
        box-shadow:0 1px 6px rgba(40,82,180,.06);
        margin:auto;
      ">
        ${templateType === 'documenti' ? 'Visualizza documento' : 'Vai alla dashboard'}
      </a>
    </div>
  ` : "";

  // Build the complete HTML with improved text alignment and styling
  return `
    <div style="font-family: ${fontFamily}; max-width: 600px; margin: 0 auto; background-color: ${backgroundColor}; color: ${textColor}; font-size: ${actualFontSize};">
      ${logoSection}
      ${employeeInfoSection}
      ${customBlockSection}
      <h2 style="color: ${primaryColor}; border-bottom: 2px solid ${primaryColor}; padding-bottom: 10px; text-align: ${headerAlignment}; font-size: ${parseInt(actualFontSize) + 4}px;">
        ${finalSubject}
      </h2>
      <div style="margin: 20px 0 0 0; line-height: 1.6; color: ${textColor}; text-align: ${bodyAlignment}; font-size: ${actualFontSize};">
        ${finalContent.replace(/\n/g, '<br>')}
        ${leaveDetailsSection}
        ${employeeNotesSection}
        ${adminNotesSection}
        ${dashboardButton}
        ${attachmentSection}
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <div style="width:100%;text-align:center;margin-top:18px;">
        <span style="color:${footerColor}; font-size:13px;">
          ${footerText}
        </span>
      </div>
    </div>
  `;
}
