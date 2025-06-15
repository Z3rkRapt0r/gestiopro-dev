import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Notification Email] Starting email function");

  try {
    const body = await req.json();
    console.log("[Notification Email] Request body:", JSON.stringify(body, null, 2));

    const { recipientId, subject, shortText, userId } = body;

    // Recupera il percorso attachment_url dal body (potrebbe essere null)
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

    // Get Brevo API key for admin
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

    console.log("[Notification Email] Found Brevo API key for admin");

    // Get admin profile info for sender name
    const { data: adminProfile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("[Notification Email] Error fetching admin profile:", profileError);
    }

    // Use the verified Brevo email and admin name for sender
    const senderName = adminProfile?.first_name && adminProfile?.last_name 
      ? `${adminProfile.first_name} ${adminProfile.last_name} - Sistema Notifiche` 
      : "Sistema Notifiche";
    
    const senderEmail = "zerkraptor@gmail.com"; // Verified Brevo email

    // Get recipient emails
    let emails: string[] = [];
    
    if (recipientId && recipientId !== "ALL") {
      console.log("[Notification Email] Getting single recipient email:", recipientId);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", recipientId)
        .single();

      if (profileError) {
        console.error("[Notification Email] Error fetching recipient profile:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch recipient profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (profile?.email) {
        emails = [profile.email];
      }
    } else {
      console.log("[Notification Email] Getting all active user emails");
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("email")
        .eq("is_active", true)
        .not("email", "is", null);

      if (profilesError) {
        console.error("[Notification Email] Error fetching profiles:", profilesError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch user profiles" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      emails = (profiles || [])
        .map(p => p.email)
        .filter(Boolean);
    }

    if (emails.length === 0) {
      console.error("[Notification Email] No valid email addresses found");
      return new Response(
        JSON.stringify({ error: "No valid email addresses found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Notification Email] Sending to emails:", emails.length, "recipients");
    console.log("[Notification Email] Using sender:", senderEmail);

    let downloadSection = '';
    if (attachment_url) {
      // Costruisco il link con testo personalizzato per l'allegato
      const bucket = "notification-attachments";
      const storageUrl = Deno.env.get("SUPABASE_URL")?.replace(/^https?:\/\//, "") ?? "";
      const bucketUrl = `https://${storageUrl}/storage/v1/object/public/${bucket}/${attachment_url}`;
      downloadSection = `
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

    // Send email via Brevo API
    const brevoPayload = {
      sender: { 
        name: senderName, 
        email: senderEmail
      },
      to: emails.map(email => ({ email })),
      subject: subject,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            ${subject}
          </h2>
          <div style="margin: 20px 0; line-height: 1.6; color: #555;">
            ${shortText.replace(/\n/g, '<br>')}
          </div>
          ${downloadSection}
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #888; margin: 0;">
            Questa è una notifica automatica dal sistema aziendale.<br>
            Inviata da: ${senderEmail}
          </p>
        </div>
      `,
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
      console.error("[Notification Email] Brevo API error:", brevoResponse.status, brevoResponseText);
      
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
