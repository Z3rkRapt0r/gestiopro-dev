
// === IMPORTS (moduli helper interni) ===
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, isBlank } from "./responseHelpers.ts";
import {
  fetchAdminSettings,
  fetchAdminProfile,
  fetchLogoUrl,
  fetchRecipientEmails,
} from "./supabaseFetchHelpers.ts";
import { buildAttachmentSection, buildHtmlContent } from "./mailTemplates.ts";

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
