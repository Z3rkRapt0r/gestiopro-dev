
export function buildLogoSection(logoUrl: string | null, logoAlignment: string, logoSize: string): string {
  if (!logoUrl) return '';
  
  return `<div style="text-align:${logoAlignment};margin-bottom:24px;">
    <img src="${logoUrl}" alt="Logo" style="max-height:${logoSize === 'small' ? '40px' : logoSize === 'large' ? '80px' : '60px'};max-width:180px;" />
  </div>`;
}

export function buildEmployeeInfoSection(employeeEmail: string | null, primaryColor: string): string {
  if (!employeeEmail) return '';
  
  return `
    <div style="background-color: #e8f4fd; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px;">
      <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">📧 Comunicazione da dipendente</h4>
      <p style="margin: 0; font-size: 14px; color: #2c5282;">
        <strong>Email dipendente:</strong> ${employeeEmail}<br>
        <span style="font-size: 12px; color: #64748b;">Puoi rispondere direttamente a questa email per contattare il dipendente</span>
      </p>
    </div>
  `;
}

export function buildCustomBlockSection(
  showCustomBlock: boolean,
  customBlockText: string,
  customBlockBgColor: string,
  customBlockTextColor: string,
  primaryColor: string,
  isAdminMessageViaCustomBlock: boolean = false
): string {
  if (!showCustomBlock || !customBlockText) return '';

  const isAdminMsg = isAdminMessageViaCustomBlock;
  const blockTitle = isAdminMsg ? '💬 Messaggio Amministratore' : '📣 Avviso Importante';
  const blockBgColor = isAdminMsg ? '#e3f2fd' : customBlockBgColor;
  const blockTextColor = isAdminMsg ? '#1565c0' : customBlockTextColor;
  
  console.log("[Section Builders] CUSTOM BLOCK SECTION CREATION:");
  console.log("  Is admin message via custom block:", isAdminMsg);
  console.log("  Block title:", blockTitle);
  console.log("  Block background color:", blockBgColor);
  console.log("  Block text color:", blockTextColor);
  console.log("  Custom block text:", customBlockText);
  
  return `
    <div style="background-color: ${blockBgColor}; padding: 20px; border-left: 4px solid ${primaryColor}; margin: 20px 0; border-radius: 6px; color: ${blockTextColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h4 style="margin: 0 0 12px 0; color: ${primaryColor}; font-size: 18px; font-weight: bold; display: flex; align-items: center;">
        <span style="margin-right: 8px;">${isAdminMsg ? '💬' : '📣'}</span>
        ${blockTitle}
      </h4>
      <div style="margin: 0; font-size: 15px; line-height: 1.6; border-top: 1px solid rgba(37, 84, 196, 0.2); padding-top: 12px;">
        ${customBlockText.replace(/\n/g, '<br>')}
      </div>
    </div>
  `;
}

export function buildLeaveDetailsSection(
  showLeaveDetails: boolean,
  leaveDetails: string,
  leaveDetailsBgColor: string,
  leaveDetailsTextColor: string,
  primaryColor: string
): string {
  if (!showLeaveDetails || !leaveDetails) return '';
  
  return `
    <div style="background-color: ${leaveDetailsBgColor}; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px; color: ${leaveDetailsTextColor};">
      <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">Dettagli Richiesta</h4>
      <p style="margin: 0; font-size: 14px;">
        ${leaveDetails.replace(/\n/g, '<br>')}
      </p>
    </div>
  `;
}

export function buildEmployeeNotesSection(
  showAdminNotes: boolean,
  isEmployeeRequest: boolean,
  employeeNotes: string,
  primaryColor: string
): string {
  if (!showAdminNotes || !isEmployeeRequest || !employeeNotes) return '';
  
  return `
    <div style="background-color: #e8f4fd; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px; color: #2c5282;">
      <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">💬 Note del Dipendente</h4>
      <p style="margin: 0; font-size: 14px;">
        ${employeeNotes.replace(/\n/g, '<br>')}
      </p>
    </div>
  `;
}

export function buildAdminNotesSection(
  showAdminNotes: boolean,
  isAdminResponse: boolean,
  adminNotes: string,
  adminNotesBgColor: string,
  adminNotesTextColor: string,
  primaryColor: string
): string {
  if (!showAdminNotes || !isAdminResponse || !adminNotes) return '';
  
  return `
    <div style="background-color: ${adminNotesBgColor}; padding: 15px; border-left: 4px solid ${primaryColor}; margin-bottom: 20px; border-radius: 4px; color: ${adminNotesTextColor};">
      <h4 style="margin: 0 0 8px 0; color: ${primaryColor}; font-size: 16px;">📋 Note Amministratore</h4>
      <p style="margin: 0; font-size: 14px;">
        ${adminNotes.replace(/\n/g, '<br>')}
      </p>
    </div>
  `;
}

export function buildDashboardButton(
  isDocumentEmail: boolean,
  showDetailsButton: boolean,
  templateType: string,
  buttonColor: string,
  buttonTextColor: string,
  borderRadius: string
): string {
  if (!isDocumentEmail || !showDetailsButton) return '';
  
  return `
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
  `;
}
