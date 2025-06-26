
// Helper function to format logo size
const getLogoSizePixels = (size: string) => {
  switch (size) {
    case 'small': return '80';
    case 'large': return '200';
    case 'medium':
    default: return '120';
  }
};

// Helper function to get font size CSS
const getFontSizeCSS = (fontSize: string) => {
  switch (fontSize) {
    case 'small': return '14px';
    case 'large': return '18px';
    case 'medium':
    default: return '16px';
  }
};

// Helper function to get text alignment
const getAlignment = (alignment: string) => {
  return alignment || 'left';
};

export const buildHtmlContent = ({
  subject,
  shortText,
  logoUrl,
  attachmentSection,
  senderEmail,
  isDocumentEmail = false,
  templateType = '',
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
  employeeEmail = '',
  showAdminMessage = false,
  adminMessage = '',
  adminMessageBgColor = '#e3f2fd',
  adminMessageTextColor = '#1565c0',
  recipientName = '',
  // NEW: Button configuration parameters
  showButton = true,
  buttonText = 'Accedi alla Dashboard',
  buttonUrl = 'https://your-app-url.com',
}: {
  subject: string;
  shortText: string;
  logoUrl?: string;
  attachmentSection?: string;
  senderEmail?: string;
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
  employeeEmail?: string;
  showAdminMessage?: boolean;
  adminMessage?: string;
  adminMessageBgColor?: string;
  adminMessageTextColor?: string;
  recipientName?: string;
  // NEW: Button configuration types
  showButton?: boolean;
  buttonText?: string;
  buttonUrl?: string;
}) => {
  const logoSizePixels = getLogoSizePixels(logoSize);
  const fontSizeCSS = getFontSizeCSS(fontSize);
  const headerAlign = getAlignment(headerAlignment);
  const bodyAlign = getAlignment(bodyAlignment);
  const logoAlign = getAlignment(logoAlignment);

  // Build logo section
  const logoSection = logoUrl ? `
    <div class="logo-section" style="text-align: ${logoAlign}; margin-bottom: 30px;">
      <img src="${logoUrl}" alt="Logo" style="max-width: ${logoSizePixels}px; height: auto; border: none;" />
    </div>
  ` : '';

  // Build header section
  const headerSection = dynamicSubject ? `
    <div class="header-section" style="text-align: ${headerAlign}; margin-bottom: 30px;">
      <h1 style="color: ${primaryColor}; font-family: ${fontFamily}; font-size: 24px; margin: 0; font-weight: bold;">
        ${dynamicSubject}
      </h1>
    </div>
  ` : '';

  // Build main content section
  const contentSection = dynamicContent ? `
    <div class="content-section" style="text-align: ${bodyAlign}; margin-bottom: 30px;">
      <div style="color: ${textColor}; font-family: ${fontFamily}; font-size: ${fontSizeCSS}; line-height: 1.6; white-space: pre-line;">
        ${dynamicContent}
      </div>
    </div>
  ` : '';

  // Build leave details section (for leave requests and responses)
  const leaveDetailsSection = (showLeaveDetails && leaveDetails) ? `
    <div class="leave-details-section" style="margin: 30px 0;">
      <div style="background-color: ${leaveDetailsBgColor}; border-left: 4px solid ${primaryColor}; padding: 20px; border-radius: ${borderRadius};">
        <div style="color: ${leaveDetailsTextColor}; font-family: ${fontFamily}; font-size: ${fontSizeCSS}; font-weight: bold; white-space: pre-line;">
          ${leaveDetails}
        </div>
      </div>
    </div>
  ` : '';

  // Build employee notes section (for leave requests from employees to admins)
  const employeeNotesSection = (employeeNotes && showAdminNotes) ? `
    <div class="employee-notes-section" style="margin: 30px 0;">
      <div style="background-color: ${adminNotesBgColor}; border-left: 4px solid ${primaryColor}; padding: 20px; border-radius: ${borderRadius};">
        <h3 style="color: ${adminNotesTextColor}; font-family: ${fontFamily}; font-size: ${fontSizeCSS}; margin: 0 0 10px 0; font-weight: bold;">
          📝 Note del Dipendente:
        </h3>
        <div style="color: ${adminNotesTextColor}; font-family: ${fontFamily}; font-size: ${fontSizeCSS}; line-height: 1.5;">
          ${employeeNotes}
        </div>
      </div>
    </div>
  ` : '';

  // Build admin notes section (for leave responses from admins to employees)
  const adminNotesSection = (adminNotes && showAdminNotes) ? `
    <div class="admin-notes-section" style="margin: 30px 0;">
      <div style="background-color: ${adminNotesBgColor}; border-left: 4px solid ${primaryColor}; padding: 20px; border-radius: ${borderRadius};">
        <h3 style="color: ${adminNotesTextColor}; font-family: ${fontFamily}; font-size: ${fontSizeCSS}; margin: 0 0 10px 0; font-weight: bold;">
          📋 Note dell'Amministratore:
        </h3>
        <div style="color: ${adminNotesTextColor}; font-family: ${fontFamily}; font-size: ${fontSizeCSS}; line-height: 1.5;">
          ${adminNotes}
        </div>
      </div>
    </div>
  ` : '';

  // Build admin message section (for admin document uploads)
  const adminMessageSection = (showAdminMessage && adminMessage) ? `
    <div class="admin-message-section" style="margin: 30px 0;">
      <div style="background-color: ${adminMessageBgColor}; border-left: 4px solid ${primaryColor}; padding: 20px; border-radius: ${borderRadius};">
        <h3 style="color: ${adminMessageTextColor}; font-family: ${fontFamily}; font-size: ${fontSizeCSS}; margin: 0 0 10px 0; font-weight: bold;">
          💬 Messaggio dell'Amministratore:
        </h3>
        <div style="color: ${adminMessageTextColor}; font-family: ${fontFamily}; font-size: ${fontSizeCSS}; line-height: 1.5;">
          ${adminMessage}
        </div>
      </div>
    </div>
  ` : '';

  // Build custom block section
  const customBlockSection = (showCustomBlock && customBlockText) ? `
    <div class="custom-block-section" style="margin: 30px 0;">
      <div style="background-color: ${customBlockBgColor}; border-left: 4px solid ${primaryColor}; padding: 20px; border-radius: ${borderRadius};">
        <div style="color: ${customBlockTextColor}; font-family: ${fontFamily}; font-size: ${fontSizeCSS}; line-height: 1.5; white-space: pre-line;">
          ${customBlockText}
        </div>
      </div>
    </div>
  ` : '';

  // NEW: Build customizable button section
  const buttonSection = showButton ? `
    <div class="button-section" style="text-align: center; margin: 40px 0;">
      <a href="${buttonUrl}" style="display: inline-block; background-color: ${buttonColor}; color: ${buttonTextColor}; text-decoration: none; padding: 15px 30px; border-radius: ${borderRadius}; font-family: ${fontFamily}; font-size: ${fontSizeCSS}; font-weight: bold; border: none; cursor: pointer;">
        ${buttonText}
      </a>
    </div>
  ` : '';

  // Build attachment section if provided
  const attachmentSectionHtml = attachmentSection || '';

  // Build footer section
  const footerSection = `
    <div class="footer-section" style="text-align: center; margin-top: 50px; padding-top: 30px; border-top: 1px solid #e0e0e0;">
      <div style="color: ${footerColor}; font-family: ${fontFamily}; font-size: 12px; line-height: 1.4;">
        ${footerText}
      </div>
    </div>
  `;

  // Combine all sections
  return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: ${fontFamily};">
      <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: ${backgroundColor}; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        ${logoSection}
        ${headerSection}
        ${contentSection}
        ${leaveDetailsSection}
        ${employeeNotesSection}
        ${adminNotesSection}
        ${adminMessageSection}
        ${customBlockSection}
        ${attachmentSectionHtml}
        ${buttonSection}
        ${footerSection}
      </div>
    </body>
    </html>
  `;
};

export const buildAttachmentSection = (attachmentUrl: string | null, primaryColor: string) => {
  if (!attachmentUrl) return '';
  
  return `
    <div class="attachment-section" style="margin: 30px 0;">
      <div style="background-color: #f8f9fa; border-left: 4px solid ${primaryColor}; padding: 20px; border-radius: 6px;">
        <h3 style="color: #495057; font-family: Arial, sans-serif; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">
          📎 Allegato:
        </h3>
        <a href="${attachmentUrl}" style="color: ${primaryColor}; text-decoration: none; font-family: Arial, sans-serif; font-size: 14px;">
          Visualizza allegato
        </a>
      </div>
    </div>
  `;
};
