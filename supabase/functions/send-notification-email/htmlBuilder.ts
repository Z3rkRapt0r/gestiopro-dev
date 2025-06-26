
import { 
  buildLogoSection,
  buildEmployeeInfoSection,
  buildCustomBlockSection,
  buildLeaveDetailsSection,
  buildEmployeeNotesSection,
  buildAdminNotesSection,
  buildAdminNotesSectionForDocuments,
  buildDashboardButton
} from './sectionBuilders.ts';

export interface ExtendedEmailContentParams {
  subject: string;
  shortText: string;
  logoUrl: string | null;
  attachmentSection: string;
  senderEmail: string;
  isDocumentEmail: boolean;
  templateType: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  logoAlignment: string;
  footerText: string;
  footerColor: string;
  fontFamily: string;
  buttonColor: string;
  buttonTextColor: string;
  borderRadius: string;
  logoSize: string;
  headerAlignment: string;
  bodyAlignment: string;
  fontSize: string;
  showDetailsButton: boolean;
  showLeaveDetails: boolean;
  showAdminNotes: boolean;
  leaveDetails: string;
  adminNotes: string;
  employeeNotes: string;
  leaveDetailsBgColor: string;
  leaveDetailsTextColor: string;
  adminNotesBgColor: string;
  adminNotesTextColor: string;
  showCustomBlock: boolean;
  customBlockText: string;
  customBlockBgColor: string;
  customBlockTextColor: string;
  dynamicSubject?: string;
  dynamicContent?: string;
  employeeEmail?: string | null;
  // Admin notes section for documents
  showAdminNotesSection?: boolean;
  adminNotesSection?: string;
  adminNotesSectionBgColor?: string;
  adminNotesSectionTextColor?: string;
}

export function buildHtmlContent(params: ExtendedEmailContentParams): string {
  console.log("[HTML Builder] Building HTML content with admin notes section params:");
  console.log("  templateType:", params.templateType);
  console.log("  showAdminNotesSection:", params.showAdminNotesSection);
  console.log("  adminNotesSection:", params.adminNotesSection);
  console.log("  adminNotesSectionBgColor:", params.adminNotesSectionBgColor);
  console.log("  adminNotesSectionTextColor:", params.adminNotesSectionTextColor);
  
  const logoSection = buildLogoSection(params.logoUrl, params.logoAlignment, params.logoSize);
  
  const employeeInfoSection = buildEmployeeInfoSection(params.employeeEmail, params.primaryColor);
  
  const customBlockSection = buildCustomBlockSection(
    params.showCustomBlock,
    params.customBlockText,
    params.customBlockBgColor,
    params.customBlockTextColor,
    params.primaryColor
  );
  
  const leaveDetailsSection = buildLeaveDetailsSection(
    params.showLeaveDetails,
    params.leaveDetails,
    params.leaveDetailsBgColor,
    params.leaveDetailsTextColor,
    params.primaryColor
  );
  
  const isEmployeeRequest = params.templateType.includes('richiesta');
  const isAdminResponse = params.templateType.includes('approvazione') || params.templateType.includes('rifiuto');
  
  const employeeNotesSection = buildEmployeeNotesSection(
    params.showAdminNotes,
    isEmployeeRequest,
    params.employeeNotes,
    params.primaryColor
  );
  
  const adminNotesSection = buildAdminNotesSection(
    params.showAdminNotes,
    isAdminResponse,
    params.adminNotes,
    params.adminNotesBgColor,
    params.adminNotesTextColor,
    params.primaryColor
  );

  // NEW: Admin notes section for documents
  const adminNotesSectionForDocs = buildAdminNotesSectionForDocuments(
    params.showAdminNotesSection || false,
    params.adminNotesSection || '',
    params.adminNotesSectionBgColor || '#e8f4fd',
    params.adminNotesSectionTextColor || '#2c5282',
    params.primaryColor
  );
  
  const dashboardButton = buildDashboardButton(
    params.isDocumentEmail,
    params.showDetailsButton,
    params.templateType,
    params.buttonColor,
    params.buttonTextColor,
    params.borderRadius
  );
  
  console.log("[HTML Builder] Admin notes section for docs length:", adminNotesSectionForDocs.length);
  console.log("[HTML Builder] Custom block section length:", customBlockSection.length);
  
  const fontSizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px'
  };
  
  const finalFontSize = fontSizeMap[params.fontSize as keyof typeof fontSizeMap] || '16px';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${params.dynamicSubject || params.subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${params.backgroundColor}; font-family: ${params.fontFamily}; font-size: ${finalFontSize}; color: ${params.textColor};">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        ${logoSection}
        ${employeeInfoSection}
        <div style="text-align: ${params.bodyAlignment}; line-height: 1.6;">
          ${(params.dynamicContent || params.shortText).replace(/\n/g, '<br>')}
        </div>
        ${leaveDetailsSection}
        ${employeeNotesSection}
        ${adminNotesSection}
        ${adminNotesSectionForDocs}
        ${customBlockSection}
        ${params.attachmentSection}
        ${dashboardButton}
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: ${params.footerColor};">
          ${params.footerText}
        </div>
      </div>
    </body>
    </html>
  `;
  
  console.log("[HTML Builder] Final HTML content length:", htmlContent.length);
  console.log("[HTML Builder] HTML content built. Admin notes section used:", !!adminNotesSectionForDocs);
  
  return htmlContent;
}
