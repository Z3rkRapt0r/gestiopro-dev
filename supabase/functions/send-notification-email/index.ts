import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildHtmlContent, buildAttachmentSection } from "./mailTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Notification Email] Starting email function");

  try {
    const body = await req.json();
    console.log("[Notification Email] Request body:", JSON.stringify(body, null, 2));

    const { recipientId, subject, shortText, userId, topic } = body;

    if (!userId) {
      console.error("[Notification Email] Missing userId in request");
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Brevo API key for admin
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
          error: "No Brevo API key configured for this admin" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Notification Email] Found Brevo API key for admin");

    // Determine template type based on topic first, then fallback to subject analysis
    let templateType = 'notifiche'; // default
    if (topic === 'document' || topic === 'documents') {
      templateType = 'documenti';
    } else if (topic === 'approvals' || topic === 'approval') {
      templateType = 'approvazioni';
    } else if (topic === 'notifications' || topic === 'notification') {
      templateType = 'notifiche';
    } else if (topic === 'permessi-richiesta') {
      templateType = 'permessi-richiesta';
    } else if (topic === 'permessi-approvazione') {
      templateType = 'permessi-approvazione';
    } else if (topic === 'permessi-rifiuto') {
      templateType = 'permessi-rifiuto';
    } else {
      // Fallback to subject analysis if topic is not clear
      const lowerSubject = subject.toLowerCase();
      if (lowerSubject.includes('documento') || lowerSubject.includes('document')) {
        templateType = 'documenti';
      } else if (lowerSubject.includes('approv')) {
        templateType = 'approvazioni';
      } else if (lowerSubject.includes('permesso') || lowerSubject.includes('ferie')) {
        if (lowerSubject.includes('approvata')) {
          templateType = 'permessi-approvazione';
        } else if (lowerSubject.includes('rifiutata')) {
          templateType = 'permessi-rifiuto';
        } else {
          templateType = 'permessi-richiesta';
        }
      }
    }

    // Get email template for the specific template type
    console.log("[Notification Email] Looking for email template:", templateType);
    const { data: emailTemplate, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("admin_id", userId)
      .eq("template_type", templateType)
      .maybeSingle();

    if (templateError) {
      console.error("[Notification Email] Error fetching email template:", templateError);
    }

    console.log("[Notification Email] Found email template:", emailTemplate);

    // Get logo URL for admin
    const { data: logoData } = await supabase.storage
      .from('company-assets')
      .getPublicUrl(`${userId}/email-logo.png?v=${Date.now()}`);

    const logoUrl = emailTemplate?.logo_url || logoData?.publicUrl;
    console.log("[Notification Email] Found logoUrl for admin:", logoUrl);

    // Get recipients list
    let recipients = [];
    if (!recipientId) {
      // For leave requests to admin, send to all admins
      if (templateType === 'permessi-richiesta') {
        const { data: adminProfiles, error: adminProfilesError } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .eq("role", "admin")
          .eq("is_active", true);
          
        if (adminProfilesError) {
          console.error("[Notification Email] Error fetching admin profiles:", adminProfilesError);
          throw adminProfilesError;
        }
        recipients = adminProfiles || [];
      } else {
        // Send to all active employees for other notifications
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .eq("is_active", true);
          
        if (profilesError) {
          console.error("[Notification Email] Error fetching profiles:", profilesError);
          throw profilesError;
        }
        recipients = profiles || [];
      }
    } else {
      // Send to specific recipient
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .eq("id", recipientId)
        .single();
        
      if (profileError) {
        console.error("[Notification Email] Error fetching recipient profile:", profileError);
        throw profileError;
      }
      recipients = profile ? [profile] : [];
    }

    console.log("[Notification Email] Recipients found:", recipients.length);

    // Get admin profile for sender info
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .single();

    const senderName = adminProfile?.first_name && adminProfile?.last_name 
      ? `${adminProfile.first_name} ${adminProfile.last_name}` 
      : "Sistema Notifiche";
    const senderEmail = "zerkraptor@gmail.com";

    let successCount = 0;
    const errors = [];

    for (const recipient of recipients) {
      try {
        // Build email content using template settings or defaults
        const templateData = emailTemplate || {
          primary_color: '#007bff',
          background_color: '#ffffff',
          text_color: '#333333',
          logo_alignment: 'center',
          footer_text: '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820',
          footer_color: '#888888',
          font_family: 'Arial, sans-serif',
          button_color: '#007bff',
          button_text_color: '#ffffff',
          border_radius: '6px'
        };

        const attachmentSection = buildAttachmentSection(null, templateData.primary_color);
        const isDocumentEmail = templateType === 'documenti';
        
        const htmlContent = buildHtmlContent({
          subject,
          shortText,
          logoUrl,
          attachmentSection,
          senderEmail,
          isDocumentEmail,
          primaryColor: templateData.primary_color,
          backgroundColor: templateData.background_color,
          textColor: templateData.text_color,
          logoAlignment: templateData.logo_alignment,
          footerText: templateData.footer_text,
          footerColor: templateData.footer_color,
          fontFamily: templateData.font_family,
          buttonColor: templateData.button_color,
          buttonTextColor: templateData.button_text_color,
          borderRadius: templateData.border_radius
        });

        const brevoPayload = {
          sender: { name: senderName, email: senderEmail },
          to: [{ email: recipient.email }],
          subject: subject,
          htmlContent,
          textContent: `${subject}\n\n${shortText}\n\nInviato da: ${senderName}`
        };

        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": adminSetting.brevo_api_key,
          },
          body: JSON.stringify(brevoPayload),
        });

        if (brevoResponse.ok) {
          successCount++;
          console.log(`[Notification Email] Email sent to ${recipient.email}`);
        } else {
          const errorText = await brevoResponse.text();
          console.error(`[Notification Email] Failed to send to ${recipient.email}:`, errorText);
          errors.push(`${recipient.email}: ${errorText}`);
        }
      } catch (error) {
        console.error(`[Notification Email] Error sending to ${recipient.email}:`, error);
        errors.push(`${recipient.email}: ${error.message}`);
      }
    }

    console.log("[Notification Email] Email sent successfully!");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        recipients: successCount,
        sender: senderEmail,
        errors: errors.length > 0 ? errors : undefined
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
