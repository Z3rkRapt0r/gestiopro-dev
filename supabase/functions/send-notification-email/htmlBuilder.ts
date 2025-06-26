
import { ExtendedEmailContentParams } from './types.ts';
import {
  buildLogoSection,
  buildEmployeeInfoSection,
  buildCustomBlockSection,
  buildLeaveDetailsSection,
  buildEmployeeNotesSection,
  buildAdminNotesSection,
  buildDashboardButton
} from './sectionBuilders.ts';

export function buildHtmlContent(params: ExtendedEmailContentParams): string {
  const {
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
    employeeEmail = '',
    showAdminMessage = false,
    adminMessage = '',
    adminMessageBgColor = '#e3f2fd',
    adminMessageTextColor = '#1565c0',
    isAdminMessageViaCustomBlock = false,
  } = params;

  // ENHANCED LOGGING FOR ADMIN MESSAGE DEBUGGING
  console.log("[HTML Builder] Building HTML content with admin message params:");
  console.log("  showAdminMessage:", showAdminMessage);
  console.log("  adminMessage:", adminMessage);
  console.log("  templateType:", templateType);
  console.log("  adminMessageBgColor:", adminMessageBgColor);
  console.log("  adminMessageTextColor:", adminMessageTextColor);
  console.log("  isAdminMessageViaCustomBlock:", isAdminMessageViaCustomBlock);
  console.log("  showCustomBlock:", showCustomBlock);
  console.log("  customBlockText:", customBlockText);

  // Determine font size in pixels
  const fontSizeMap: { [key: string]: string } = {
    'small': '14px',
    'medium': '16px',
    'large': '18px'
  };
  const actualFontSize = fontSizeMap[fontSize] || '16px';

  // Build sections
  const logoSection = buildLogoSection(logoUrl, logoAlignment, logoSize);
  const employeeInfoSection = buildEmployeeInfoSection(employeeEmail, primaryColor);
  const customBlockSection = buildCustomBlockSection(
    showCustomBlock,
    customBlockText,
    customBlockBgColor,
    customBlockTextColor,
    primaryColor,
    isAdminMessageViaCustomBlock
  );

  // Determine final subject and content
  const finalSubject = dynamicSubject || subject;
  const finalContent = dynamicContent || shortText;

  const leaveDetailsSection = buildLeaveDetailsSection(
    showLeaveDetails,
    leaveDetails,
    leaveDetailsBgColor,
    leaveDetailsTextColor,
    primaryColor
  );

  // Determine if this is an employee request or admin response
  const isEmployeeRequest = templateType.includes('richiesta');
  const isAdminResponse = templateType.includes('approvazione') || templateType.includes('rifiuto');

  const employeeNotesSection = buildEmployeeNotesSection(
    showAdminNotes,
    isEmployeeRequest,
    employeeNotes,
    primaryColor
  );

  const adminNotesSection = buildAdminNotesSection(
    showAdminNotes,
    isAdminResponse,
    adminNotes,
    adminNotesBgColor,
    adminNotesTextColor,
    primaryColor
  );

  const dashboardButton = buildDashboardButton(
    isDocumentEmail,
    showDetailsButton,
    templateType,
    buttonColor,
    buttonTextColor,
    borderRadius
  );

  // Build the complete HTML
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
      </div>
      ${leaveDetailsSection}
      ${employeeNotesSection}
      ${adminNotesSection}
      ${dashboardButton}
      ${attachmentSection}
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <div style="width:100%;text-align:center;margin-top:18px;">
        <span style="color:${footerColor}; font-size:13px;">
          ${footerText}
        </span>
      </div>
    </div>
  `;

  console.log("[HTML Builder] HTML content built. Custom block strategy used:", showCustomBlock);
  console.log("[HTML Builder] Final HTML content length:", htmlContent.length);
  console.log("[HTML Builder] Custom block section length:", customBlockSection.length);
  
  return htmlContent;
}
