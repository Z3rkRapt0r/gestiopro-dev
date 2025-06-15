
// === CORS & Response Helpers ===
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function isBlank(str: unknown) {
  return typeof str !== "string" || !str.trim();
}

// === Supabase Fetch Helpers ===
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Recupera la Brevo API Key dalle impostazioni admin.
 */
async function fetchAdminSettings(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("brevo_api_key")
    .eq("admin_id", userId)
    .maybeSingle();
  if (error || !data?.brevo_api_key) {
    throw new Error("No Brevo API key configured for this admin. Please configure it in the admin settings.");
  }
  return data.brevo_api_key;
}

/**
 * Recupera nome/cognome admin per la firma.
 */
async function fetchAdminProfile(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[Notification Email] Error fetching admin profile:", error);
    return null;
  }
  return data;
}

/**
 * Recupera la URL pubblica del logo (con cache-busting).
 */
async function fetchLogoUrl(supabase: any, userId: string) {
  try {
    const { data: logoData } = await supabase
      .storage
      .from("company-assets")
      .getPublicUrl(`${userId}/email-logo.png`);
    if (logoData?.publicUrl) {
      const cacheBuster = `v=${Date.now()}`;
      const logoUrlNoCache =
        logoData.publicUrl.indexOf("?") === -1
          ? `${logoData.publicUrl}?${cacheBuster}`
          : `${logoData.publicUrl}&${cacheBuster}`;
      console.log("[Notification Email] Found logoUrl for admin:", logoUrlNoCache);
      return logoUrlNoCache;
    }
    console.log("[Notification Email] No custom logo for admin, skipping logo.");
    return null;
  } catch (e) {
    console.error("[Notification Email] Error checking logo:", e);
    return null;
  }
}

/**
 * Estrae gli indirizzi email dei destinatari (uno o tutti).
 */
async function fetchRecipientEmails(supabase: any, recipientId: string | null) {
  if (recipientId && recipientId !== "ALL") {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", recipientId)
      .maybeSingle();

    if (profileError) {
      throw new Error("Failed to fetch recipient profile");
    }
    return profile?.email ? [profile.email] : [];
  } else {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email")
      .eq("is_active", true)
      .not("email", "is", null);

    if (profilesError) {
      throw new Error("Failed to fetch user profiles");
    }
    return (profiles || []).map((p: any) => p.email).filter(Boolean);
  }
}


// === TEMPLATES & HTML HELPERS ===
/**
 * Costruisce la sezione download allegato per le mail.
 */
function buildAttachmentSection(bucketUrl: string | null) {
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

/**
 * Assembla il corpo HTML dell'email, inclusi logo e allegato.
 */
function buildHtmlContent({ subject, shortText, logoUrl, attachmentSection, senderEmail }: {
  subject: string,
  shortText: string,
  logoUrl: string | null,
  attachmentSection: string,
  senderEmail: string
}) {
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
      <div style="margin: 20px 0; line-height: 1.6; color: #555;">
        ${shortText.replace(/\n/g, '<br>')}
      </div>
      ${attachmentSection}
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #888; margin: 0;">
        Questa è una notifica automatica dal sistema aziendale.<br>
        Inviata da: ${senderEmail}
      </p>
    </div>
  `;
}

// === MAIN EDGE FUNCTION HANDLER ===
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Notification Email] Starting email function");

  try {
    // --- Preprocessing and validation ---
    const body = await req.json();
    console.log("[Notification Email] Request body:", JSON.stringify(body, null, 2));

    const { recipientId, subject, shortText, userId } = body;
    const attachment_url = body.attachment_url ?? null;

    if (!userId) {
      console.error("[Notification Email] Missing userId in request");
      return jsonResponse({ error: "Missing userId" }, 400);
    }

    if (isBlank(subject) || isBlank(shortText)) {
      console.error("[Notification Email] Missing subject or shortText");
      return jsonResponse({ error: "Missing subject or shortText" }, 400);
    }

    // --- Supabase client init ---
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Recupero API key Brevo ---
    let brevoApiKey: string;
    try {
      brevoApiKey = await fetchAdminSettings(supabase, userId);
      console.log("[Notification Email] Found Brevo API key for admin");
    } catch (err: any) {
      console.error("[Notification Email]", err.message);
      return jsonResponse({ error: err.message }, 400);
    }

    // --- Profilo/nome mittente ---
    const adminProfile = await fetchAdminProfile(supabase, userId);
    const senderName =
      adminProfile?.first_name && adminProfile?.last_name
        ? `${adminProfile.first_name} ${adminProfile.last_name} - Sistema Notifiche`
        : "Sistema Notifiche";
    const senderEmail = "zerkraptor@gmail.com"; // Verified Brevo email

    // --- Logo aziendale (con cache busting) ---
    const logoUrl = await fetchLogoUrl(supabase, userId);

    // --- Destinatari ---
    let emails: string[];
    try {
      emails = await fetchRecipientEmails(supabase, recipientId);
    } catch (err: any) {
      console.error("[Notification Email]", err.message);
      return jsonResponse({ error: err.message }, 500);
    }

    if (emails.length === 0) {
      console.error("[Notification Email] No valid email addresses found");
      return jsonResponse({ error: "No valid email addresses found" }, 400);
    }

    // --- Section download allegato, se serve ---
    let downloadSection = '';
    let bucketUrl: string | null = null;
    if (attachment_url) {
      const bucket = "notification-attachments";
      const storageUrl = Deno.env.get("SUPABASE_URL")?.replace(/^https?:\/\//, "") ?? "";
      bucketUrl = `https://${storageUrl}/storage/v1/object/public/${bucket}/${attachment_url}`;
      downloadSection = buildAttachmentSection(bucketUrl);
    }

    // --- Corpo HTML email ---
    const htmlContent = buildHtmlContent({
      subject,
      shortText,
      logoUrl,
      attachmentSection: downloadSection,
      senderEmail
    });

    // --- Costruzione payload Brevo ---
    const brevoPayload = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: emails.map(email => ({ email })),
      subject: subject,
      htmlContent: htmlContent,
      textContent: `${subject}\n\n${shortText}\n${attachment_url ? "\nAllegato incluso, accedi al portale per scaricarlo." : ""}\n\n--- Notifica automatica dal sistema aziendale ---`
    };

    // --- Invio via Brevo ---
    console.log("[Notification Email] Calling Brevo API...");

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify(brevoPayload),
    });

    const brevoResponseText = await brevoResponse.text();
    console.log("[Notification Email] Brevo response status:", brevoResponse.status);
    console.log("[Notification Email] Brevo response:", brevoResponseText);

    if (!brevoResponse.ok) {
      console.error("[Notification Email] Brevo API error:", brevoResponse.status, brevoResponseText);
      let errorMessage = "Failed to send email via Brevo";
      try {
        const errorData = JSON.parse(brevoResponseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = brevoResponseText || errorMessage;
      }
      return jsonResponse({
        error: errorMessage,
        status: brevoResponse.status,
        details: brevoResponseText
      }, 500);
    }

    console.log("[Notification Email] Email sent successfully!");

    return jsonResponse({
      success: true,
      message: "Email sent successfully",
      recipients: emails.length,
      sender: senderEmail
    });
  } catch (error: any) {
    console.error("[Notification Email] Unexpected error:", error);
    return jsonResponse({
      error: "Internal server error",
      details: error.message
    }, 500);
  }
});

