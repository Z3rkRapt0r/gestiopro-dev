
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

  console.log("[Test Email] Starting test email function");

  try {
    const body = await req.json();
    console.log("[Test Email] Request body:", JSON.stringify(body, null, 2));

    const { templateId, testEmail, userId, subject, content } = body;

    if (!userId) {
      console.error("[Test Email] Missing userId in request");
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!testEmail || !subject || !content) {
      console.error("[Test Email] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Brevo API key for admin
    console.log("[Test Email] Looking for admin settings for user:", userId);
    
    const { data: adminSetting, error: settingsError } = await supabase
      .from("admin_settings")
      .select("brevo_api_key")
      .eq("admin_id", userId)
      .single();

    if (settingsError) {
      console.error("[Test Email] Error fetching admin settings:", settingsError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch admin settings", 
          details: settingsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!adminSetting?.brevo_api_key) {
      console.error("[Test Email] No Brevo API key found for admin:", userId);
      return new Response(
        JSON.stringify({ 
          error: "No Brevo API key configured for this admin" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Test Email] Found Brevo API key for admin");

    // Get admin profile info for sender
    const { data: adminProfile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("[Test Email] Error fetching admin profile:", profileError);
    }

    // Use admin email as sender or fallback to a default
    const senderName = adminProfile?.first_name && adminProfile?.last_name 
      ? `${adminProfile.first_name} ${adminProfile.last_name} - Sistema Notifiche` 
      : "Sistema Notifiche";
    
    const senderEmail = adminProfile?.email || "noreply@your-domain.com";

    // Send test email via Brevo API
    const brevoPayload = {
      sender: { 
        name: senderName, 
        email: senderEmail
      },
      to: [{ email: testEmail }],
      subject: `[TEST] ${subject}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px;">
            <h3 style="margin: 0; color: #007bff;">🧪 Questa è un'email di prova</h3>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
              Template: ${templateId ? "Template personalizzato" : "Email diretta"}
            </p>
          </div>
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            ${subject}
          </h2>
          <div style="margin: 20px 0; line-height: 1.6; color: #555;">
            ${content.replace(/\n/g, '<br>')}
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #888; margin: 0;">
            Questa è un'email di prova dal sistema aziendale.<br>
            Inviata da: ${senderEmail}<br>
            Destinatario: ${testEmail}
          </p>
        </div>
      `,
      textContent: `[TEST] ${subject}\n\n${content}\n\n--- Questa è un'email di prova ---\nInviata da: ${senderEmail}`
    };

    console.log("[Test Email] Calling Brevo API with sender:", senderEmail);

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": adminSetting.brevo_api_key,
      },
      body: JSON.stringify(brevoPayload),
    });

    const brevoResponseText = await brevoResponse.text();
    console.log("[Test Email] Brevo response status:", brevoResponse.status);
    console.log("[Test Email] Brevo response:", brevoResponseText);

    if (!brevoResponse.ok) {
      console.error("[Test Email] Brevo API error:", brevoResponse.status, brevoResponseText);
      
      let errorMessage = "Failed to send test email via Brevo";
      try {
        const errorData = JSON.parse(brevoResponseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
        
        // Specific error handling for common Brevo issues
        if (errorMessage.includes("sender") || errorMessage.includes("domain")) {
          errorMessage = "Errore: L'indirizzo email del mittente non è verificato in Brevo. Verifica il dominio in Brevo: https://app.brevo.com/senders/domain";
        }
      } catch (e) {
        errorMessage = brevoResponseText || errorMessage;
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: brevoResponse.status,
          details: brevoResponseText,
          suggestion: "Verifica che il dominio email sia configurato e verificato in Brevo (https://app.brevo.com/senders/domain)"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Test Email] Test email sent successfully!");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Test email sent successfully",
        recipient: testEmail,
        sender: senderEmail
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Test Email] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
