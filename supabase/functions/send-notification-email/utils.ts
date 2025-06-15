
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOGO_BUCKET = "company-assets";
const LOGO_PATH = "email-logo.png";
const DEFAULT_FOOTER = "Questo messaggio è stato generato automaticamente.";

// Recupera impostazioni template globale email
export async function getGlobalEmailTemplate(supabase: any, userId: string) {
  let logoAlign: "left" | "center" | "right" = "left";
  let footerText: string = DEFAULT_FOOTER;
  let logoPublicUrl: string | null = null;

  // 1. Recupera template globale "generale"
  const { data: tpl } = await supabase
    .from("email_templates")
    .select("name,subject")
    .eq("admin_id", userId)
    .eq("topic", "generale")
    .maybeSingle();

  if (tpl) {
    footerText = tpl.subject || DEFAULT_FOOTER;
    if (tpl.name === "right" || tpl.name === "center") {
      logoAlign = tpl.name;
    }
  }

  // 2. Recupera URL pubblico del logo
  const { data: logoData } = await supabase
    .storage
    .from(LOGO_BUCKET)
    .getPublicUrl(`${userId}/${LOGO_PATH}`);
  if (logoData?.publicUrl) {
    logoPublicUrl = logoData.publicUrl;
  }

  return { logoAlign, footerText, logoPublicUrl };
}

// Genera HTML content per la mail
export function generateEmailHtml({
  subject,
  shortText,
  logoHtml,
  downloadSection,
  footerText
}: {
  subject: string;
  shortText: string;
  logoHtml: string;
  downloadSection: string;
  footerText: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background:white; border:1px solid #eee; padding:36px;">
      ${logoHtml}
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        ${subject}
      </h2>
      <div style="margin: 20px 0; line-height: 1.6; color: #555;">
        ${shortText.replace(/\n/g, '<br>')}
      </div>
      ${downloadSection}
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <footer style="font-size:13px; color:#888; margin-top:30px; text-align:center;">
        ${footerText}
      </footer>
    </div>
  `;
}

// Costruisci HTML per logo allineato
export function getLogoHtml(logoPublicUrl: string | null, logoAlign: "left" | "center" | "right") {
  if (!logoPublicUrl) return "";
  return `
    <div style="width:100%;text-align:${logoAlign};margin-bottom:16px;">
      <img src="${logoPublicUrl}" alt="logo" style="max-height:60px;max-width:200px;" />
    </div>
  `;
}

// Costruisci downloadSection per eventuale allegato
export function buildDownloadSection(attachment_url: string | null, supabaseUrl: string | null) {
  if (!attachment_url || !supabaseUrl) return "";
  const bucket = "notification-attachments";
  const storageUrl = supabaseUrl.replace(/^https?:\/\//, "");
  const bucketUrl = `https://${storageUrl}/storage/v1/object/public/${bucket}/${attachment_url}`;
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
