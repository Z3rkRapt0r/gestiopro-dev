
/** Helpers per sezioni HTML email (logo, corpo, allegato, pulsante vedi doc) */

// Pulsante centrato che porta alla dashboard - solo per documenti
export function buildDashboardButton(buttonUrl: string, isDocumentEmail: boolean = false) {
  if (!isDocumentEmail) return "";
  
  return `
    <div style="width:100%;text-align:center;margin:28px 0 0 0;">
      <a href="${buttonUrl}" target="_blank" style="
        background-color:#007bff;
        color:#fff;
        padding:12px 26px;
        border-radius:6px;
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
  `;
}

export function buildAttachmentSection(bucketUrl: string | null) {
  if (!bucketUrl) return "";
  return `
    <div style="margin-top: 20px; border-left: 4px solid #007bff; padding-left: 10px;">
      <strong>Documento allegato disponibile</strong><br>
      <span style="font-size: 14px; color: #333;">
        Per visualizzare o scaricare il documento, clicca sul link sottostante.<br/>
        <span style="font-size: 12px; color: #888;">È necessario effettuare l'accesso con il tuo account aziendale.</span>
      </span>
      <div style="margin-top: 8px;">
        <a href="${bucketUrl}" target="_blank" style="color: #007bff; font-weight: bold;">Apri allegato</a>
      </div>
    </div>
  `;
}

export function buildHtmlContent({ subject, shortText, logoUrl, attachmentSection, senderEmail, isDocumentEmail = false }: {
  subject: string,
  shortText: string,
  logoUrl: string | null,
  attachmentSection: string,
  senderEmail: string,
  isDocumentEmail?: boolean
}) {
  // Aggiungi pulsante solo se è una email relativa ai documenti
  const dashboardButton = buildDashboardButton("https://alm-app.lovable.app/", isDocumentEmail);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${
        logoUrl
          ? `<div style="text-align:center;margin-bottom:24px;">
              <img src="${logoUrl}" alt="Logo" style="max-height:60px;max-width:180px;" />
            </div>`
          : ""
      }
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        ${subject}
      </h2>
      <div style="margin: 20px 0 0 0; line-height: 1.6; color: #555;">
        ${shortText.replace(/\n/g, '<br>')}
        ${dashboardButton}
      </div>
      ${attachmentSection}
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <div style="width:100%;text-align:center;margin-top:18px;">
        <span style="color:#888; font-size:13px;">
          &copy; A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820
        </span>
      </div>
    </div>
  `;
}
