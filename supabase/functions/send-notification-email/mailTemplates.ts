/** Helpers per sezioni HTML email (logo, corpo, allegato, pulsante vedi doc) */

// Pulsante centrato che porta alla dashboard - per documenti e permessi
export function buildDashboardButton(buttonUrl: string, templateType: string = 'documenti', buttonColor: string = '#007bff', buttonTextColor: string = '#ffffff', borderRadius: string = '6px', showButton: boolean = true) {
  // Se il pulsante è disabilitato nel template, non mostrarlo
  if (!showButton) {
    return "";
  }
  
  let buttonText = 'Visualizza';
  
  switch (templateType) {
    case 'documenti':
      buttonText = 'Visualizza documento';
      break;
    case 'permessi-richiesta':
      buttonText = 'Gestisci Richiesta';
      break;
    case 'permessi-approvazione':
    case 'permessi-rifiuto':
      buttonText = 'Visualizza Dettagli';
      break;
    case 'approvazioni':
      buttonText = 'Gestisci Richiesta';
      break;
    default:
      buttonText = 'Visualizza';
  }
  
  // Show button for documents and leave-related templates
  if (!['documenti', 'approvazioni', 'permessi-richiesta', 'permessi-approvazione', 'permessi-rifiuto'].includes(templateType)) {
    return "";
  }
  
  return `
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
}

export function buildAttachmentSection(bucketUrl: string | null, primaryColor: string = '#007bff') {
  if (!bucketUrl) return "";
  return `
    <div style="margin-top: 20px; border-left: 4px solid ${primaryColor}; padding-left: 10px;">
      <strong>Documento allegato disponibile</strong><br>
      <span style="font-size: 14px; color: #333;">
        Per visualizzare o scaricare il documento, clicca sul link sottostante.<br/>
        <span style="font-size: 12px; color: #888;">È necessario effettuare l'accesso con il tuo account aziendale.</span>
      </span>
      <div style="margin-top: 8px;">
        <a href="${bucketUrl}" target="_blank" style="color: ${primaryColor}; font-weight: bold;">Apri allegato</a>
      </div>
    </div>
  `;
}

interface EmailTemplateData {
  subject: string;
  shortText: string;
  logoUrl: string | null;
  attachmentSection: string;
  senderEmail: string;
  isDocumentEmail?: boolean;
  templateType?: string;
  // Parametri per personalizzazione template
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
  leaveDetails?: string;
}

function getLogoSize(size?: string) {
  switch (size) {
    case 'small': return '40px';
    case 'medium': return '60px';
    case 'large': return '80px';
    default: return '60px';
  }
}

function getFontSize(size?: string) {
  switch (size) {
    case 'small': return '14px';
    case 'medium': return '16px';
    case 'large': return '18px';
    default: return '16px';
  }
}

export function buildHtmlContent({ 
  subject, 
  shortText, 
  logoUrl, 
  attachmentSection, 
  senderEmail, 
  isDocumentEmail = false,
  templateType = 'documenti',
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
  leaveDetails = ''
}: EmailTemplateData) {
  // Determine if we should show button based on template type and settings
  const shouldShowButton = isDocumentEmail || (['approvazioni', 'permessi-richiesta', 'permessi-approvazione', 'permessi-rifiuto'].includes(templateType) && showDetailsButton);
  const dashboardButton = shouldShowButton ? buildDashboardButton("https://alm-app.lovable.app/", templateType, buttonColor, buttonTextColor, borderRadius, showDetailsButton) : "";

  // Check if we should show leave details
  const isLeaveTemplate = ['permessi-richiesta', 'permessi-approvazione', 'permessi-rifiuto'].includes(templateType);
  const shouldShowLeaveDetailsSection = isLeaveTemplate && showLeaveDetails && leaveDetails;

  return `
    <div style="font-family: ${fontFamily}; max-width: 600px; margin: 0 auto; background-color: ${backgroundColor}; color: ${textColor}; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      ${
        logoUrl
          ? `<div style="text-align:${logoAlignment};margin-bottom:24px;">
              <img src="${logoUrl}" alt="Logo" style="max-height:${getLogoSize(logoSize)};max-width:200px;object-fit:contain;" />
            </div>`
          : ""
      }
      <div style="text-align:${headerAlignment};margin-bottom:24px;">
        <h2 style="color: ${primaryColor}; margin: 0 0 16px 0; font-size: 24px; font-weight: bold;">
          ${subject}
        </h2>
      </div>
      <div style="text-align: ${bodyAlignment}; line-height: 1.6; margin-bottom: 24px; font-size: ${getFontSize(fontSize)};">
        <div style="margin: 0 0 16px 0; white-space: pre-line;">
          ${shortText.replace(/\n/g, '<br>')}
        </div>
        ${shouldShowLeaveDetailsSection ? `
          <div style="background-color: ${primaryColor}15; padding: 12px; border-radius: 6px; margin-top: 16px; font-size: 14px; white-space: pre-line;">
            ${leaveDetails.replace(/\n/g, '<br>')}
          </div>
        ` : ''}
      </div>
      ${dashboardButton}
      ${attachmentSection}
      <div style="border-top: 1px solid ${primaryColor}20; padding-top: 24px; margin-top: 32px; text-align: center;">
        <p style="color: ${footerColor}; font-size: 13px; margin: 0; line-height: 1.4;">
          ${footerText}
        </p>
      </div>
    </div>
  `;
}
