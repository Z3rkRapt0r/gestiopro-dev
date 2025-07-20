
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
  // Admin message parameters
  showAdminMessage?: boolean;
  adminMessage?: string;
  adminMessageBgColor?: string;
  adminMessageTextColor?: string;
  // NEW: Recipient name parameter
  recipientName?: string;
  // NEW: Button configuration parameters
  showButton?: boolean;
  buttonText?: string;
  buttonUrl?: string;
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
  employeeEmail = '', // New parameter for employee email
  // Admin message parameters
  showAdminMessage = false,
  adminMessage = '',
  adminMessageBgColor = '#e3f2fd',
  adminMessageTextColor = '#1565c0',
  // NEW: Recipient name parameter
  recipientName = '',
  // NEW: Button configuration parameters
  showButton = true,
  buttonText = 'Accedi alla Dashboard',
  buttonUrl = 'https://alm-app.lovable.app/',
}: EmailContentParams & {
  employeeEmail?: string;
  recipientName?: string;
}) {
  // CRITICAL DEBUG LOGGING FOR ADMIN MESSAGE
  console.log("[Mail Templates] ===== BUILDING HTML CONTENT =====");
  console.log("[Mail Templates] Admin message processing:");
  console.log("  showAdminMessage:", showAdminMessage);
  console.log("  adminMessage:", adminMessage);
  console.log("  adminMessage length:", adminMessage ? adminMessage.length : 0);
  console.log("  adminMessage empty:", !adminMessage || adminMessage.trim() === '');
  console.log("  templateType:", templateType);
  console.log("  adminMessageBgColor:", adminMessageBgColor);
  console.log("  adminMessageTextColor:", adminMessageTextColor);
  console.log("  recipientName:", recipientName);

  // Enhanced logging for button configuration
  console.log("[Mail Templates] Button configuration:");
  console.log("  showButton:", showButton);
  console.log("  buttonText:", buttonText);
  console.log("  buttonUrl:", buttonUrl);
  console.log("  templateType:", templateType);

  // ENHANCED: Determine email direction based on template category and employee email
  console.log("[Mail Templates] Email direction debugging:");
  console.log("  templateType:", templateType);
  console.log("  employeeEmail present:", !!employeeEmail);
  console.log("  employeeNotes:", employeeNotes);
  console.log("  adminMessage:", adminMessage);

  // FIXED: Properly distinguish between employee-to-admin and admin-to-employee emails
  const isEmployeeToAdmin = templateType === 'documenti' && employeeEmail && employeeNotes;
  const isAdminToEmployee = templateType === 'documenti' && !employeeEmail && adminMessage;
  const isLeaveRequest = templateType.includes('richiesta');
  const isLeaveResponse = templateType.includes('approvazione') || templateType.includes('rifiuto');

  console.log("[Mail Templates] Email context determination:");
  console.log("  isEmployeeToAdmin:", isEmployeeToAdmin);
  console.log("  isAdminToEmployee:", isAdminToEmployee);
  console.log("  isLeaveRequest:", isLeaveRequest);
  console.log("  isLeaveResponse:", isLeaveResponse);

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

  // Employee info section for admin notifications (when employee contacts admin)
  const employeeInfoSection = isEmployeeToAdmin ? `
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

  // CRITICAL: Admin Message Section - Show for ALL templates where showAdminMessage is true
  let adminMessageSection = '';
  
  // CORRECTED: Show admin message when requested AND message exists
  const shouldShowAdminMessage = showAdminMessage && adminMessage && adminMessage.trim() !== '';
  
  console.log("[Mail Templates] Admin message section decision:");
  console.log("  showAdminMessage:", showAdminMessage);
  console.log("  adminMessage exists:", !!adminMessage);
  console.log("  adminMessage not empty:", adminMessage && adminMessage.trim() !== '');
  console.log("  shouldShowAdminMessage:", shouldShowAdminMessage);
  
  if (shouldShowAdminMessage) {
    adminMessageSection = `
      <div style="background-color: ${adminMessageBgColor}; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px; color: ${adminMessageTextColor};">
        <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">💬 Messaggio Amministratore</h4>
        <p style="margin: 0; font-size: 14px;">
          ${adminMessage.replace(/\n/g, '<br>')}
        </p>
      </div>
    `;
    console.log("[Mail Templates] ADMIN MESSAGE SECTION CREATED for template:", templateType);
    console.log("[Mail Templates] Admin message content:", adminMessage);
  } else {
    console.log("[Mail Templates] Admin message section NOT created:");
    console.log("  showAdminMessage:", showAdminMessage);
    console.log("  adminMessage exists:", !!adminMessage);
    console.log("  adminMessage not empty:", adminMessage && adminMessage.trim() !== '');
  }

  // Determine final subject and content
  const finalSubject = dynamicSubject || subject;
  let finalContent = dynamicContent || shortText;

  console.log("[Mail Templates] NOT replacing {admin_message} placeholder - using dedicated section only");

  // Leave Details Section
  const leaveDetailsSection = showLeaveDetails && leaveDetails ? `
    <div style="background-color: ${leaveDetailsBgColor}; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px; color: ${leaveDetailsTextColor};">
      <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">Dettagli Richiesta</h4>
      <p style="margin: 0; font-size: 14px;">
        ${leaveDetails.replace(/\n/g, '<br>')}
      </p>
    </div>
  ` : "";

  // FIXED: Employee Notes Section - Only for employee-to-admin communications or leave requests
  const shouldShowEmployeeNotes = showAdminNotes && employeeNotes && (isEmployeeToAdmin || isLeaveRequest);
  
  const employeeNotesSection = shouldShowEmployeeNotes ? `
    <div style="background-color: #e8f4fd; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px; color: #2c5282;">
      <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">💬 Note del Dipendente</h4>
      <p style="margin: 0; font-size: 14px;">
        ${employeeNotes.replace(/\n/g, '<br>')}
      </p>
    </div>
  ` : "";

  console.log("[Mail Templates] Employee notes section decision:");
  console.log("  showAdminNotes:", showAdminNotes);
  console.log("  employeeNotes exists:", !!employeeNotes);
  console.log("  isEmployeeToAdmin:", isEmployeeToAdmin);
  console.log("  isLeaveRequest:", isLeaveRequest);
  console.log("  shouldShowEmployeeNotes:", shouldShowEmployeeNotes);
  console.log("  employeeNotesSection created:", !!employeeNotesSection);

  // FIXED: Admin Notes Section - Only for admin leave responses
  const adminNotesSection = showAdminNotes && isLeaveResponse && adminNotes ? `
    <div style="background-color: ${adminNotesBgColor}; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px; color: ${adminNotesTextColor};">
      <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">📋 Note Amministratore</h4>
      <p style="margin: 0; font-size: 14px;">
        ${adminNotes.replace(/\n/g, '<br>')}
      </p>
    </div>
  ` : "";

  // NEW: Updated button generation logic - now for ALL templates (except documents if showButton is false)
  let customButton = '';
  const shouldShowCustomButton = showButton && templateType !== 'documenti';
  
  console.log("[Mail Templates] Custom button decision:");
  console.log("  showButton:", showButton);
  console.log("  templateType:", templateType);
  console.log("  shouldShowCustomButton:", shouldShowCustomButton);
  
  if (shouldShowCustomButton) {
    customButton = `
      <div style="width:100%;text-align:center;margin:28px 0 0 0;">
        <a href="${buttonUrl}" target="_blank" style="
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
          ${buttonText}
        </a>
      </div>
    `;
    console.log("[Mail Templates] Custom button created:", buttonText);
  }

  // Dashboard button for document emails only (legacy support)
  const dashboardButton = (isDocumentEmail && showDetailsButton && templateType === 'documenti') ? `
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
        Visualizza documento
      </a>
    </div>
  ` : "";

  // ENHANCED: Build the complete HTML with properly separated sections
  const htmlContent = `
    <div style="font-family: ${fontFamily}; max-width: 600px; margin: 0 auto; background-color: ${backgroundColor}; color: ${textColor}; font-size: ${actualFontSize};">
      ${logoSection}
      ${employeeInfoSection}
      ${customBlockSection}
      <h2 style="color: ${primaryColor}; border-bottom: 2px solid ${primaryColor}; padding-bottom: 10px; text-align: ${headerAlignment}; font-size: ${parseInt(actualFontSize) + 4}px;">
        ${finalSubject}
      </h2>
      <div style="margin: 20px 0 0 0; line-height: 1.6; color: ${textColor}; text-align: ${bodyAlignment}; font-size: ${actualFontSize};">
        ${finalContent.replace(/\n/g, '<br>')}
        ${adminMessageSection}
        ${leaveDetailsSection}
        ${employeeNotesSection}
        ${adminNotesSection}
        ${customButton}
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

  console.log("[Mail Templates] HTML content built with separated sections:");
  console.log("  Admin message section included:", shouldShowAdminMessage);
  console.log("  Employee notes section included:", shouldShowEmployeeNotes);
  console.log("  Custom button included:", shouldShowCustomButton);
  console.log("  Final HTML length:", htmlContent.length);
  
  return htmlContent;
}
