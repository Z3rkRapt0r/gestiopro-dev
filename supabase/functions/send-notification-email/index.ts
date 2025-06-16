
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

    const { recipientId, subject, shortText, userId, topic, body: emailBody, adminNote } = body;

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

    // Use template data with fallback to defaults
    const templateData = emailTemplate || {
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
      font_size: 'medium',
      button_color: '#007bff',
      button_text_color: '#ffffff',
      border_radius: '6px',
      show_details_button: true,
      show_leave_details: true,
      show_admin_notes: true,
      admin_notes_bg_color: '#f8f9fa',
      admin_notes_text_color: '#495057',
      leave_details_bg_color: '#e3f2fd',
      leave_details_text_color: '#1565c0'
    };

    // Use template logo if available, otherwise fallback to admin logo
    let logoUrl = templateData.logo_url;
    if (!logoUrl) {
      const { data: logoData } = await supabase.storage
        .from('company-assets')
        .getPublicUrl(`${userId}/email-logo.png?v=${Date.now()}`);
      logoUrl = logoData?.publicUrl;
    }

    console.log("[Notification Email] Using logoUrl:", logoUrl);
    console.log("[Notification Email] Template settings - show_details_button:", templateData.show_details_button, "show_leave_details:", templateData.show_leave_details, "show_admin_notes:", templateData.show_admin_notes);

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
        const attachmentSection = buildAttachmentSection(null, templateData.primary_color);
        
        // Determine if this should show button - notifications should always show button unless explicitly disabled
        const isDocumentEmail = templateType === 'documenti';
        const isNotificationEmail = templateType === 'notifiche';
        
        // Use template subject and content if available, otherwise use provided values
        let emailSubject = emailTemplate?.subject || subject;
        let emailContent = emailTemplate?.content || shortText;
        
        // If using template content, replace placeholders with actual data
        if (emailTemplate?.content && recipient.first_name && recipient.last_name) {
          emailContent = emailTemplate.content.replace(/Mario Rossi/g, `${recipient.first_name} ${recipient.last_name}`);
        }
        
        // Prepare leave details and admin notes for templates that support them
        let leaveDetails = '';
        let adminNotes = '';
        
        if (['permessi-richiesta', 'permessi-approvazione', 'permessi-rifiuto'].includes(templateType) && emailBody) {
          leaveDetails = emailBody;
        }
        
        if (['permessi-approvazione', 'permessi-rifiuto'].includes(templateType) && adminNote) {
          adminNotes = adminNote;
        }
        
        const htmlContent = buildHtmlContent({
          subject: emailSubject,
          shortText: emailContent,
          logoUrl,
          attachmentSection,
          senderEmail,
          isDocumentEmail: isDocumentEmail || isNotificationEmail, // This makes notifications show the button
          templateType,
          primaryColor: templateData.primary_color,
          backgroundColor: templateData.background_color,
          textColor: templateData.text_color,
          logoAlignment: templateData.logo_alignment,
          footerText: templateData.footer_text,
          footerColor: templateData.footer_color,
          fontFamily: templateData.font_family,
          buttonColor: templateData.button_color,
          buttonTextColor: templateData.button_text_color,
          borderRadius: templateData.border_radius,
          logoSize: templateData.logo_size,
          headerAlignment: templateData.header_alignment,
          bodyAlignment: templateData.body_alignment,
          fontSize: templateData.font_size,
          showDetailsButton: templateData.show_details_button,
          showLeaveDetails: templateData.show_leave_details,
          showAdminNotes: templateData.show_admin_notes,
          leaveDetails,
          adminNotes,
          leaveDetailsBgColor: templateData.leave_details_bg_color,
          leaveDetailsTextColor: templateData.leave_details_text_color,
          adminNotesBgColor: templateData.admin_notes_bg_color,
          adminNotesTextColor: templateData.admin_notes_text_color
        });

        const brevoPayload = {
          sender: { name: senderName, email: senderEmail },
          to: [{ email: recipient.email }],
          subject: emailSubject,
          htmlContent,
          textContent: `${emailSubject}\n\n${emailContent}\n\nInviato da: ${senderName}`
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
