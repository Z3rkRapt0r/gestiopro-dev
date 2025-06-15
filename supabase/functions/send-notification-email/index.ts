import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getGlobalEmailTemplate,
  getLogoHtml,
  generateEmailHtml,
  buildDownloadSection,
} from "./utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGO_BUCKET = "company-assets";
const LOGO_PATH = "email-logo.png";
const DEFAULT_FOOTER = "Questo messaggio è stato generato automaticamente.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Notification Email] Starting email function");

  try {
    const body = await req.json();
    console.log("[Notification Email] Request body:", JSON.stringify(body, null, 2));

    const { recipientId, subject, shortText, userId } = body;
    const attachment_url = body.attachment_url ?? null;

    if (!userId) {
      console.error("[Notification Email] Missing userId in request");
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subject || !shortText) {
      console.error("[Notification Email] Missing subject or shortText");
      return new Response(
        JSON.stringify({ error: "Missing subject or shortText" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // RECUPERA IMPOSTAZIONI TEMPLATE GLOBALE (ora include senderName)
    const { logoAlign, footerText, logoPublicUrl } = await getGlobalEmailTemplate(supabase, userId);

    // RECUPERA ADMIN SETTINGS
    console.log("[Notification Email] Looking for admin settings for user:", userId);
    const { data: adminSetting, error: settingsError } = await supabase
      .from("admin_settings")
      .select("brevo_api_key")
      .eq("admin_id", userId)
      .single();

    if (settingsError) {
      console.error("[Notification Email] Error fetching admin settings:", settingsError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch admin settings", 
          details: settingsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!adminSetting?.brevo_api_key) {
      console.error("[Notification Email] No Brevo API key found for admin:", userId);
      return new Response(
        JSON.stringify({ 
          error: "No Brevo API key configured for this admin. Please configure it in the admin settings." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RECUPERA ADMIN PROFILE INFO
    const { data: adminProfile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .single();

    // mittente: fisso per tutte le mail
    const senderNameSafe = "A.L.M Infissi";
    const senderEmail = "zerkraptor@gmail.com"; // Verified Brevo email

    // RECUPERA EMAIL DESTINATARI
    let emails: string[] = [];
    if (recipientId && recipientId !== "ALL") {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", recipientId)
        .single();

      if (profile?.email) {
        emails = [profile.email];
      }
    } else {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("email")
        .eq("is_active", true)
        .not("email", "is", null);

      emails = (profiles || [])
        .map(p => p.email)
        .filter(Boolean);
    }

    if (emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid email addresses found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // COSTRUISCI HTML LOGO + SEZIONE DOWNLOAD
    const logoHtml = getLogoHtml(logoPublicUrl, logoAlign);
    const downloadSection = buildDownloadSection(attachment_url, Deno.env.get("SUPABASE_URL"));

    // COMPOSIZIONE EMAIL PAYLOAD
    const brevoPayload = {
      sender: { 
        name: senderNameSafe, 
        email: senderEmail
      },
      to: emails.map(email => ({ email })),
      subject: subject,
      htmlContent: generateEmailHtml({
        subject,
        shortText,
        logoHtml,
        downloadSection,
        footerText,
      }),
      textContent: `${subject}\n\n${shortText}\n${attachment_url ? "\nAllegato incluso, accedi al portale per scaricarlo." : ""}\n\n--- Notifica automatica dal sistema aziendale ---`
    };

    console.log("[Notification Email] Calling Brevo API...");

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": adminSetting.brevo_api_key,
      },
      body: JSON.stringify(brevoPayload),
    });

    const brevoResponseText = await brevoResponse.text();
    console.log("[Notification Email] Brevo response status:", brevoResponse.status);
    console.log("[Notification Email] Brevo response:", brevoResponseText);

    if (!brevoResponse.ok) {
      let errorMessage = "Failed to send email via Brevo";
      try {
        const errorData = JSON.parse(brevoResponseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = brevoResponseText || errorMessage;
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: brevoResponse.status,
          details: brevoResponseText
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Notification Email] Email sent successfully!");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        recipients: emails.length,
        sender: senderEmail
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Notification Email] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
