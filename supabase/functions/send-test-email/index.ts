
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildHtmlContent, buildAttachmentSection } from "./mailTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper per preparare i dati di test specifici per tipo di template
function prepareTestData(templateType: string, subject: string, content: string) {
  return {
    employeeName: 'Mario Rossi (Test)',
    employeeEmail: 'mario.rossi@example.com',
    recipientName: 'Test Utente',
    alertDate: '15 Gennaio 2025',
    alertTime: '09:30',
    expectedTime: '08:00',
    currentDate: new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
    leaveType: 'Ferie',
    leavePeriod: '15-20 Gennaio 2025',
    leaveReason: 'Ferie invernali',
    leaveDetails: `Tipo: Ferie\nPeriodo: 15-20 Gennaio 2025\nMotivo: Ferie invernali`,
    employeeNote: 'Spero di poter approfittare di questi giorni per riposare.',
    adminNote: 'Richiesta approvata. Buone vacanze!',
    documentName: 'Contratto_Lavoro_2025.pdf',
    adminMessage: 'Ho caricato il tuo contratto rinnovato. Controlla e firmalo entro il 31/01.'
  };
}

// Helper per sostituire le variabili nel contenuto con i dati di test
function replaceTemplateVariables(text: string, testData: any): string {
  if (!text) return '';

  return text
    // Variabili dipendente
    .replace(/\{employeeName\}/gi, testData.employeeName)
    .replace(/\{employee_name\}/gi, testData.employeeName)
    .replace(/\{employeeEmail\}/gi, testData.employeeEmail)
    .replace(/\{employee_email\}/gi, testData.employeeEmail)
    .replace(/\{recipientName\}/gi, testData.recipientName)
    .replace(/\{recipient_name\}/gi, testData.recipientName)

    // Variabili alert presenze
    .replace(/\{alertDate\}/gi, testData.alertDate)
    .replace(/\{alert_date\}/gi, testData.alertDate)
    .replace(/\{alertTime\}/gi, testData.alertTime)
    .replace(/\{alert_time\}/gi, testData.alertTime)
    .replace(/\{expectedTime\}/gi, testData.expectedTime)
    .replace(/\{expected_time\}/gi, testData.expectedTime)
    .replace(/\{currentDate\}/gi, testData.currentDate)
    .replace(/\{current_date\}/gi, testData.currentDate)

    // Variabili ferie/permessi
    .replace(/\{leaveDetails\}/gi, testData.leaveDetails)
    .replace(/\{leave_details\}/gi, testData.leaveDetails)
    .replace(/\{leaveType\}/gi, testData.leaveType)
    .replace(/\{leave_type\}/gi, testData.leaveType)
    .replace(/\{leavePeriod\}/gi, testData.leavePeriod)
    .replace(/\{leave_period\}/gi, testData.leavePeriod)
    .replace(/\{employeeNote\}/gi, testData.employeeNote)
    .replace(/\{employee_note\}/gi, testData.employeeNote)
    .replace(/\{adminNote\}/gi, testData.adminNote)
    .replace(/\{admin_note\}/gi, testData.adminNote)

    // Variabili documenti
    .replace(/\{documentName\}/gi, testData.documentName)
    .replace(/\{document_name\}/gi, testData.documentName)
    .replace(/\{adminMessage\}/gi, testData.adminMessage)
    .replace(/\{admin_message\}/gi, testData.adminMessage);
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

    const { templateType, templateCategory = "generale", testEmail, userId, subject, content, templateOverrides } = body;

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

    // Get Resend settings for admin including global logo settings
    console.log("[Test Email] Looking for admin settings for user:", userId);

    const { data: adminSetting, error: settingsError } = await supabase
      .from("admin_settings")
      .select("resend_api_key, sender_name, sender_email, reply_to, global_logo_url, global_logo_alignment, global_logo_size")
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

    if (!adminSetting?.resend_api_key) {
      console.error("[Test Email] No Resend API key found for admin:", userId);
      return new Response(
        JSON.stringify({
          error: "No Resend API key configured for this admin"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Test Email] Found Resend settings for admin");

    // Get email template for the specific template type and category
    console.log("[Test Email] Looking for email template:", templateType, templateCategory);
    const { data: emailTemplate, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("admin_id", userId)
      .eq("template_type", templateType)
      .eq("template_category", templateCategory)
      .maybeSingle();

    if (templateError) {
      console.error("[Test Email] Error fetching email template:", templateError);
    }

    console.log("[Test Email] Found email template:", emailTemplate);

    // Use template data or defaults
    let template = emailTemplate || {
      template_type: templateType,
      template_category: templateCategory,
      name: `Template ${templateType}`,
      primary_color: '#007bff',
      secondary_color: '#6c757d',
      background_color: '#ffffff',
      text_color: '#333333',
      footer_text: '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820',
      footer_color: '#888888',
      text_alignment: 'left',
      font_family: 'Arial, sans-serif',
      button_color: '#007bff',
      button_text_color: '#ffffff',
      border_radius: '6px'
    };

    // IMPORTANTE: Se sono stati passati templateOverrides dall'editor, usali invece dei dati dal database
    // Questo permette di testare le modifiche in tempo reale prima di salvare
    if (templateOverrides) {
      console.log("[Test Email] Using template overrides from editor");
      template = {
        ...template,
        ...templateOverrides
      };
    }

    // Get admin profile for fallback sender info
    const { data: adminProfile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("[Test Email] Error fetching admin profile:", profileError);
    }

    // Use configured sender settings with fallbacks
    let senderName, senderEmail;
    
    if (adminSetting.sender_name && adminSetting.sender_name.trim()) {
      senderName = adminSetting.sender_name.trim();
    } else if (adminProfile?.first_name && adminProfile?.last_name) {
      senderName = `${adminProfile.first_name} ${adminProfile.last_name} - Sistema Notifiche`;
    } else {
      senderName = "Sistema Notifiche";
    }

    if (adminSetting.sender_email && adminSetting.sender_email.trim()) {
      senderEmail = adminSetting.sender_email.trim();
    } else {
      senderEmail = "zerkraptor@gmail.com"; // Fallback verified email
    }

    console.log("[Test Email] Using sender:", senderName, "<" + senderEmail + ">");

    // Get logo URL from global settings, template, or storage
    let logoUrl = adminSetting.global_logo_url;
    let logoAlignment = adminSetting.global_logo_alignment || template.logo_alignment || 'center';
    let logoSize = adminSetting.global_logo_size || template.logo_size || 'medium';

    if (!logoUrl && template.logo_url) {
      logoUrl = template.logo_url;
    }

    if (!logoUrl) {
      const { data: logoData } = await supabase.storage
        .from('company-assets')
        .getPublicUrl(`${userId}/email-logo.png?v=${Date.now()}`);
      logoUrl = logoData?.publicUrl;
    }

    console.log("[Test Email] Using logoUrl:", logoUrl);

    // Prepare test data
    const testData = prepareTestData(templateType, subject, content);

    // Replace variables in subject and content with test data
    const finalSubject = replaceTemplateVariables(subject, testData);
    // IMPORTANTE: Usa sempre il contenuto passato dal dialog (quello che l'utente sta modificando)
    // NON usare il contenuto dal database perché vogliamo testare le modifiche in tempo reale
    let finalContent = replaceTemplateVariables(content, testData);
    console.log("[Test Email] Using provided content parameter from editor");

    console.log("[Test Email] Building HTML content with buildHtmlContent");
    console.log("[Test Email] Template settings:", {
      primaryColor: template.primary_color,
      backgroundColor: template.background_color,
      textColor: template.text_color,
      fontFamily: template.font_family,
      hasFooter: !!template.footer_text
    });

    let htmlContent;
    try {
      // Determine if this is a leave-related email for proper section display
      const isLeaveRequest = templateType.includes('richiesta');
      const isLeaveResponse = templateType.includes('approvazione') || templateType.includes('rifiuto');

      // Build attachment section (empty for test emails)
      const attachmentSection = buildAttachmentSection(null, template.primary_color || '#007bff');

      // Build HTML using the same function as send-notification-email
      htmlContent = buildHtmlContent({
        subject: finalSubject,
        shortText: finalContent,
        logoUrl: logoUrl || '',
        attachmentSection,
        senderEmail,
        isDocumentEmail: templateType === 'documenti',
        templateType,
        primaryColor: template.primary_color || '#007bff',
        backgroundColor: template.background_color || '#ffffff',
        textColor: template.text_color || '#333333',
        logoAlignment,
        footerText: template.footer_text || '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820',
        footerColor: template.footer_color || '#888888',
        fontFamily: template.font_family || 'Arial, sans-serif',
        logoSize,
        headerAlignment: template.header_alignment || 'center',
        bodyAlignment: template.body_alignment || 'left',
        fontSize: template.font_size || 'medium',
        showLeaveDetails: template.show_leave_details !== false,
        showAdminNotes: template.show_admin_notes !== false,
        leaveDetails: isLeaveRequest || isLeaveResponse ? testData.leaveDetails : '',
        adminNotes: isLeaveResponse ? testData.adminNote : '',
        employeeNotes: isLeaveRequest ? testData.employeeNote : '',
        leaveDetailsBgColor: template.leave_details_bg_color || '#e3f2fd',
        leaveDetailsTextColor: template.leave_details_text_color || '#1565c0',
        adminNotesBgColor: template.admin_notes_bg_color || '#f8f9fa',
        adminNotesTextColor: template.admin_notes_text_color || '#495057',
        showCustomBlock: template.show_custom_block || false,
        customBlockText: template.custom_block_text || '',
        customBlockBgColor: template.custom_block_bg_color || '#fff3cd',
        customBlockTextColor: template.custom_block_text_color || '#856404',
        dynamicSubject: finalSubject,
        dynamicContent: finalContent,
        employeeEmail: testData.employeeEmail,
        showAdminMessage: template.show_admin_message && isLeaveResponse,
        adminMessage: testData.adminMessage,
        adminMessageBgColor: template.admin_message_bg_color || '#e3f2fd',
        adminMessageTextColor: template.admin_message_text_color || '#1565c0',
        recipientName: testData.recipientName,
      });

      console.log("[Test Email] HTML content generated successfully, length:", htmlContent?.length || 0);
    } catch (htmlError) {
      console.error("[Test Email] Error building HTML content:", htmlError);
      console.error("[Test Email] Error stack:", htmlError.stack);
      return new Response(
        JSON.stringify({
          error: "Failed to build email content",
          details: htmlError.message
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Resend payload
    const resendPayload: any = {
      from: `${senderName} <${senderEmail}>`,
      to: [testEmail],
      subject: `[TEST] ${subject}`,
      html: htmlContent,
    };

    // Add reply_to if configured
    if (adminSetting.reply_to && adminSetting.reply_to.trim()) {
      resendPayload.reply_to = adminSetting.reply_to.trim();
    }

    console.log("[Test Email] Calling Resend API");
    console.log("[Test Email] Resend payload:", {
      from: resendPayload.from,
      to: resendPayload.to,
      subject: resendPayload.subject,
      reply_to: resendPayload.reply_to,
      html_length: htmlContent?.length || 0
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminSetting.resend_api_key}`,
      },
      body: JSON.stringify(resendPayload),
    });

    const resendResponseText = await resendResponse.text();
    console.log("[Test Email] Resend response status:", resendResponse.status);
    console.log("[Test Email] Resend response:", resendResponseText);

    if (!resendResponse.ok) {
      console.error("[Test Email] Resend API error:", resendResponse.status, resendResponseText);

      let errorMessage = "Failed to send test email via Resend";
      try {
        const errorData = JSON.parse(resendResponseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = resendResponseText || errorMessage;
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          status: resendResponse.status,
          details: resendResponseText
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
        sender: `${senderName} <${senderEmail}>`,
        template: `${templateType} (${templateCategory})`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Test Email] Unexpected error:", error);
    console.error("[Test Email] Error stack:", error.stack);

    // Try to get more details about the error
    const errorDetails = {
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      stack: error.stack || 'No stack trace'
    };

    console.error("[Test Email] Full error details:", JSON.stringify(errorDetails, null, 2));

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message || 'Unknown error',
        errorName: error.name,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
