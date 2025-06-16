
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper per costruire il contenuto HTML dell'email con personalizzazioni
function buildTestHtmlContent(template: any, subject: string, content: string) {
  const isDocumentEmail = template.template_type === 'documenti';
  
  // Pulsante per email documenti
  const dashboardButton = isDocumentEmail ? `
    <div style="width:100%;text-align:center;margin:28px 0 0 0;">
      <a href="https://alm-app.lovable.app/" target="_blank" style="
        background-color:${template.button_color || '#007bff'};
        color:${template.button_text_color || '#ffffff'};
        padding:12px 26px;
        border-radius:${template.border_radius || '6px'};
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
  ` : "";

  return `
    <div style="font-family: ${template.font_family || 'Arial, sans-serif'}; max-width: 600px; margin: 0 auto; background-color: ${template.background_color || '#ffffff'}; color: ${template.text_color || '#333333'};">
      ${
        template.logo_url
          ? `<div style="text-align:${template.logo_alignment || 'center'};margin-bottom:24px;">
              <img src="${template.logo_url}" alt="Logo" style="max-height:${template.logo_size === 'small' ? '40px' : template.logo_size === 'large' ? '80px' : '60px'};max-width:180px;" />
            </div>`
          : ""
      }
      <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid ${template.primary_color || '#007bff'}; margin-bottom: 20px;">
        <h3 style="margin: 0; color: ${template.primary_color || '#007bff'};">🧪 Questa è un'email di prova</h3>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
          Template: ${template.name || template.template_type}
        </p>
      </div>
      <h2 style="color: ${template.primary_color || '#007bff'}; border-bottom: 2px solid ${template.primary_color || '#007bff'}; padding-bottom: 10px; text-align: ${template.header_alignment || 'center'};">
        ${subject}
      </h2>
      <div style="margin: 20px 0 0 0; line-height: 1.6; color: ${template.text_color || '#333333'}; text-align: ${template.body_alignment || 'left'};">
        ${content.replace(/\n/g, '<br>')}
        ${dashboardButton}
      </div>
      <hr style="border: none; border-top: 1px solid ${template.secondary_color || '#eee'}; margin: 30px 0;">
      <div style="width:100%;text-align:center;margin-top:18px;">
        <span style="color:${template.footer_color || '#888888'}; font-size:13px;">
          ${template.footer_text || '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820'}
        </span>
      </div>
    </div>
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Test Email] Starting test email function");

  try {
    const body = await req.json();
    console.log("[Test Email] Request body:", JSON.stringify(body, null, 2));

    const { templateType, testEmail, userId, subject, content } = body;

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

    // Get email template for the specific template type
    console.log("[Test Email] Looking for email template:", templateType);
    const { data: emailTemplate, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("admin_id", userId)
      .eq("template_type", templateType)
      .maybeSingle();

    if (templateError) {
      console.error("[Test Email] Error fetching email template:", templateError);
    }

    console.log("[Test Email] Found email template:", emailTemplate);

    // Use template data or defaults
    const template = emailTemplate || {
      template_type: templateType,
      name: `Template ${templateType}`,
      primary_color: '#007bff',
      secondary_color: '#6c757d',
      background_color: '#ffffff',
      text_color: '#333333',
      logo_alignment: 'center',
      logo_size: 'medium',
      footer_text: '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820',
      footer_color: '#888888',
      header_alignment: 'center',
      body_alignment: 'left',
      font_family: 'Arial, sans-serif',
      button_color: '#007bff',
      button_text_color: '#ffffff',
      border_radius: '6px'
    };

    // Get admin profile info for sender name
    const { data: adminProfile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("[Test Email] Error fetching admin profile:", profileError);
    }

    // Use the verified Brevo email and admin name for sender
    const senderName = adminProfile?.first_name && adminProfile?.last_name 
      ? `${adminProfile.first_name} ${adminProfile.last_name} - Sistema Notifiche` 
      : "Sistema Notifiche";
    
    const senderEmail = "zerkraptor@gmail.com"; // Verified Brevo email

    // Generate HTML content using template settings
    const htmlContent = buildTestHtmlContent(template, subject, content);

    // Send test email via Brevo API
    const brevoPayload = {
      sender: { 
        name: senderName, 
        email: senderEmail
      },
      to: [{ email: testEmail }],
      subject: `[TEST] ${subject}`,
      htmlContent,
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
