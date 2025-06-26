
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
