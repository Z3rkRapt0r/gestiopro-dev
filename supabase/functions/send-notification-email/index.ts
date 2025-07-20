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

  console.log("[Notification Email] ===== STARTING EMAIL FUNCTION =====");

  try {
    const body = await req.json();
    console.log("[Notification Email] RAW REQUEST BODY:", JSON.stringify(body, null, 2));

    const { recipientId, subject, shortText, userId, topic, body: emailBody, adminNote, employeeEmail, employeeName, employeeNote, adminMessage } = body;

    // ENHANCED: Detailed parameter logging
    console.log("[Notification Email] PARSED PARAMETERS:");
    console.log("  recipientId:", recipientId);
    console.log("  subject:", subject);
    console.log("  shortText:", shortText);
    console.log("  userId:", userId);
    console.log("  topic:", topic);
    console.log("  emailBody:", emailBody);
    console.log("  adminNote:", adminNote);
    console.log("  employeeEmail:", employeeEmail);
    console.log("  employeeName:", employeeName);
    console.log("  employeeNote:", employeeNote);
    console.log("  adminMessage:", adminMessage);

    // CRITICAL: Check for empty/undefined values that might cause issues
    console.log("[Notification Email] PARAMETER VALIDATION:");
    console.log("  adminMessage empty?", !adminMessage || adminMessage.trim() === '');
    console.log("  emailBody empty?", !emailBody || emailBody.trim() === '');
    console.log("  subject empty?", !subject || subject.trim() === '');

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Improved admin identification logic
    let adminSettingsUserId = userId;
    
    // If no userId provided or if we need to find an admin with Brevo settings
    if (!userId || !adminSettingsUserId) {
      console.log("[Notification Email] No userId provided, searching for admin with Brevo settings");
      
      const { data: adminWithBrevo, error: adminSearchError } = await supabase
        .from("admin_settings")
        .select("admin_id, brevo_api_key")
        .not("brevo_api_key", "is", null)
        .limit(1)
        .single();

      if (!adminSearchError && adminWithBrevo) {
        adminSettingsUserId = adminWithBrevo.admin_id;
        console.log("[Notification Email] Found admin with Brevo settings:", adminSettingsUserId);
      } else {
        console.error("[Notification Email] No admin with Brevo settings found:", adminSearchError);
      }
    }

    if (!adminSettingsUserId) {
      console.error("[Notification Email] No valid admin ID found for Brevo settings");
      return new Response(
        JSON.stringify({ error: "No admin with Brevo configuration found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Notification Email] Using admin ID for settings:", adminSettingsUserId);

    // Get Brevo settings for admin including sender configuration and global logo
    const { data: adminSetting, error: settingsError } = await supabase
      .from("admin_settings")
      .select("brevo_api_key, sender_name, sender_email, reply_to, global_logo_url, global_logo_alignment, global_logo_size")
      .eq("admin_id", adminSettingsUserId)
      .single();

    console.log("[Notification Email] BREVO SETTINGS CHECK:");
    console.log("  Settings found:", !!adminSetting);
    console.log("  API key exists:", !!adminSetting?.brevo_api_key);
    console.log("  Settings error:", settingsError);

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
      console.error("[Notification Email] No Brevo API key found for admin:", adminSettingsUserId);
      return new Response(
        JSON.stringify({ 
          error: "No Brevo API key configured for this admin" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Notification Email] Found Brevo settings for admin");

    // ENHANCED TEMPLATE TYPE MAPPING
    let templateType = 'notifiche';
    let templateCategory = 'generale';
    
    if (topic === 'document' || topic === 'documents') {
      templateType = 'documenti';
      templateCategory = employeeEmail ? 'dipendenti' : 'amministratori';
    } else if (topic === 'approvals' || topic === 'approval') {
      templateType = 'approvazioni';
      templateCategory = 'amministratori';
    } else if (topic === 'notifications' || topic === 'notification') {
      templateType = 'notifiche';
      templateCategory = employeeEmail ? 'dipendenti' : 'amministratori';
    } else if (topic === 'permessi-richiesta') {
      templateType = 'permessi-richiesta';
      templateCategory = 'dipendenti';
    } else if (topic === 'ferie-richiesta') {
      templateType = 'ferie-richiesta';
      templateCategory = 'dipendenti';
    } else if (topic === 'permessi-approvazione') {
      templateType = 'permessi-approvazione';
      templateCategory = 'amministratori';
    } else if (topic === 'ferie-approvazione') {
      templateType = 'ferie-approvazione';
      templateCategory = 'amministratori';
    } else if (topic === 'permessi-rifiuto') {
      templateType = 'permessi-rifiuto';
      templateCategory = 'amministratori';
    } else if (topic === 'ferie-rifiuto') {
      templateType = 'ferie-rifiuto';
      templateCategory = 'amministratori';
    } else {
      // Enhanced fallback to subject analysis if topic is not clear
      const lowerSubject = subject?.toLowerCase() || '';
      if (lowerSubject.includes('documento') || lowerSubject.includes('document')) {
        templateType = 'documenti';
        templateCategory = employeeEmail ? 'dipendenti' : 'amministratori';
      } else if (lowerSubject.includes('approv')) {
        templateType = 'approvazioni';
        templateCategory = 'amministratori';
      } else if (lowerSubject.includes('permesso')) {
        if (lowerSubject.includes('approvata') || lowerSubject.includes('approvato')) {
          templateType = 'permessi-approvazione';
          templateCategory = 'amministratori';
        } else if (lowerSubject.includes('rifiutata') || lowerSubject.includes('rifiutato')) {
          templateType = 'permessi-rifiuto';
          templateCategory = 'amministratori';
        } else {
          templateType = 'permessi-richiesta';
          templateCategory = employeeEmail ? 'dipendenti' : 'amministratori';
        }
      } else if (lowerSubject.includes('ferie')) {
        if (lowerSubject.includes('approvata') || lowerSubject.includes('approvato')) {
          templateType = 'ferie-approvazione';
          templateCategory = 'amministratori';
        } else if (lowerSubject.includes('rifiutata') || lowerSubject.includes('rifiutato')) {
          templateType = 'ferie-rifiuto';
          templateCategory = 'amministratori';
        } else {
          templateType = 'ferie-richiesta';
          templateCategory = employeeEmail ? 'dipendenti' : 'amministratori';
        }
      } else {
        templateType = 'notifiche';
        templateCategory = employeeEmail ? 'dipendenti' : 'amministratori';
      }
    }

    console.log("[Notification Email] TEMPLATE MAPPING RESULT:");
    console.log("  Template Type:", templateType);
    console.log("  Template Category:", templateCategory);
    console.log("  Topic:", topic);
    console.log("  EmployeeEmail present:", !!employeeEmail);

    // Check if this is an admin notification template (should use dynamic content)
    const isAdminNotificationTemplate = templateType === 'notifiche' && templateCategory === 'amministratori';

    // Get email template for the specific template type and category
    console.log("[Notification Email] SEARCHING FOR TEMPLATE:", templateType, templateCategory);
    const { data: emailTemplate, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("admin_id", adminSettingsUserId)
      .eq("template_type", templateType)
      .eq("template_category", templateCategory)
      .maybeSingle();

    console.log("[Notification Email] TEMPLATE QUERY RESULT:");
    console.log("  Template found:", !!emailTemplate);
    console.log("  Template error:", templateError);
    console.log("  Is admin notification template:", isAdminNotificationTemplate);

    if (templateError) {
      console.error("[Notification Email] Error fetching email template:", templateError);
    }
    
    // ENHANCED LOGGING FOR ADMIN MESSAGE DEBUGGING
    if (emailTemplate) {
      console.log("[Notification Email] TEMPLATE DETAILS:");
      console.log("  show_admin_message:", emailTemplate.show_admin_message);
      console.log("  admin_message_bg_color:", emailTemplate.admin_message_bg_color);
      console.log("  admin_message_text_color:", emailTemplate.admin_message_text_color);
      console.log("  show_button:", emailTemplate.show_button);
      console.log("  button_text:", emailTemplate.button_text);
      console.log("  button_url:", emailTemplate.button_url);
      console.log("  subject:", emailTemplate.subject);
      console.log("  content preview:", emailTemplate.content ? emailTemplate.content.substring(0, 100) + "..." : "null");
    }

    // Template data handling - prioritize database template or use minimal fallback
    let templateData;
    if (emailTemplate) {
      templateData = emailTemplate;
      console.log("[Notification Email] Using custom template from database");
    } else {
      // Minimal fallback template with basic styling only
      templateData = {
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
        leave_details_text_color: '#1565c0',
        show_custom_block: false,
        custom_block_text: '',
        custom_block_bg_color: '#fff3cd',
        custom_block_text_color: '#856404',
        text_alignment: 'left',
        subject: null,
        content: null,
        show_admin_message: false,
        admin_message_bg_color: '#e3f2fd',
        admin_message_text_color: '#1565c0',
        show_button: true,
        button_text: 'Accedi alla Dashboard',
        button_url: 'https://alm-app.lovable.app/',
      };
      console.log("[Notification Email] No custom template found, using minimal fallback styling only");
    }

    // Use global logo settings or fallback
    let logoUrl = adminSetting.global_logo_url;
    let logoAlignment = adminSetting.global_logo_alignment || templateData.logo_alignment || 'center';
    let logoSize = adminSetting.global_logo_size || templateData.logo_size || 'medium';
    
    if (!logoUrl) {
      logoUrl = templateData.logo_url;
      if (!logoUrl) {
        const { data: logoData } = await supabase.storage
          .from('company-assets')
          .getPublicUrl(`${adminSettingsUserId}/email-logo.png?v=${Date.now()}`);
        logoUrl = logoData?.publicUrl;
      }
    }

    console.log("[Notification Email] LOGO SETTINGS:");
    console.log("  Logo URL:", logoUrl);
    console.log("  Logo alignment:", logoAlignment);
    console.log("  Logo size:", logoSize);

    // Get recipients list
    let recipients = [];
    console.log("[Notification Email] DETERMINING RECIPIENTS:");
    console.log("  RecipientId:", recipientId);
    console.log("  Template type:", templateType);
    
    if (!recipientId) {
      // CORRECTED: For ALL employee requests (permessi/ferie/documents), send ONLY to administrators
      if (templateType === 'permessi-richiesta' || templateType === 'ferie-richiesta' || (employeeEmail && templateType === 'documenti')) {
        console.log("[Notification Email] Sending to all admins for employee request");
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
        console.log("[Notification Email] Found admin recipients:", recipients.length);
      } else {
        // Send to all active employees for admin notifications
        console.log("[Notification Email] Sending to all employees for admin notification");
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .eq("is_active", true);
          
        if (profilesError) {
          console.error("[Notification Email] Error fetching profiles:", profilesError);
          throw profilesError;
        }
        recipients = profiles || [];
        console.log("[Notification Email] Found employee recipients:", recipients.length);
      }
    } else {
      // Send to specific recipient
      console.log("[Notification Email] Sending to specific recipient:", recipientId);
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
      console.log("[Notification Email] Found specific recipient:", recipients.length);
    }

    console.log("[Notification Email] RECIPIENTS FINAL COUNT:", recipients.length);

    // Get admin profile for fallback sender info
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", adminSettingsUserId)
      .single();

    // Use configured sender settings with intelligent fallbacks
    let senderName, senderEmail;
    
    if (adminSetting.sender_name && adminSetting.sender_name.trim()) {
      senderName = adminSetting.sender_name.trim();
    } else if (adminProfile?.first_name && adminProfile?.last_name) {
      senderName = `${adminProfile.first_name} ${adminProfile.last_name}`;
    } else {
      senderName = "Sistema Notifiche";
    }

    if (adminSetting.sender_email && adminSetting.sender_email.trim()) {
      senderEmail = adminSetting.sender_email.trim();
    } else {
      senderEmail = "zerkraptor@gmail.com"; // Fallback verified email
    }

    console.log("[Notification Email] SENDER CONFIGURATION:");
    console.log("  Sender name:", senderName);
    console.log("  Sender email:", senderEmail);

    // Determine if we should use employee email as reply-to
    let dynamicReplyTo = null;
    const isEmployeeToAdminNotification = templateCategory === 'dipendenti' && employeeEmail;
    
    if (isEmployeeToAdminNotification) {
      dynamicReplyTo = employeeEmail;
      console.log("[Notification Email] Using employee email as reply-to:", employeeEmail);
    } else if (adminSetting.reply_to && adminSetting.reply_to.trim()) {
      dynamicReplyTo = adminSetting.reply_to.trim();
      console.log("[Notification Email] Using configured reply-to:", dynamicReplyTo);
    }

    let successCount = 0;
    const errors = [];

    // FIXED: Initialize finalAdminMessage correctly for all types including documents
    let finalAdminMessage = '';
    const isLeaveResponse = templateType.includes('approvazione') || templateType.includes('rifiuto');
    const isDocumentTemplate = templateType === 'documenti';
    
    console.log("[Notification Email] ADMIN MESSAGE PROCESSING:");
    console.log("  Is leave response:", isLeaveResponse);
    console.log("  Is document template:", isDocumentTemplate);
    console.log("  Raw adminMessage:", adminMessage);
    console.log("  Raw emailBody:", emailBody);
    console.log("  Raw adminNote:", adminNote);
    
    if (isLeaveResponse) {
      // For leave responses, use adminNote if available, otherwise use emailBody
      finalAdminMessage = adminNote || emailBody || adminMessage || '';
      console.log("[Notification Email] Leave response - final admin message:", finalAdminMessage);
    } else if (isDocumentTemplate) {
      // FIXED: For document templates, prioritize adminMessage from form
      finalAdminMessage = adminMessage || emailBody || '';
      console.log("[Notification Email] Document template - final admin message:", finalAdminMessage);
    } else {
      // For other types, use adminMessage or emailBody
      finalAdminMessage = adminMessage || emailBody || '';
      console.log("[Notification Email] Other template - final admin message:", finalAdminMessage);
    }

    console.log("[Notification Email] FINAL ADMIN MESSAGE RESULT:");
    console.log("  finalAdminMessage:", finalAdminMessage);
    console.log("  finalAdminMessage length:", finalAdminMessage.length);
    console.log("  finalAdminMessage empty?", !finalAdminMessage || finalAdminMessage.trim() === '');

    for (const recipient of recipients) {
      try {
        console.log("[Notification Email] ===== PROCESSING RECIPIENT:", recipient.email, "=====");
        
        const attachmentSection = buildAttachmentSection(null, templateData.primary_color);
        
        const isDocumentEmail = templateType === 'documenti';
        const isNotificationEmail = templateType === 'notifiche';
        
        // NEW: DYNAMIC CONTENT LOGIC FOR ADMIN NOTIFICATION TEMPLATES
        let emailSubject, emailContent;
        
        if (isAdminNotificationTemplate) {
          // ADMIN NOTIFICATION TEMPLATE: Always use dynamic content from form
          console.log("[Notification Email] ADMIN NOTIFICATION TEMPLATE - Using dynamic content from form");
          
          if (subject && subject.trim()) {
            emailSubject = subject.trim();
            console.log("[Notification Email] Using form subject:", emailSubject);
          } else if (emailTemplate && emailTemplate.subject && emailTemplate.subject.trim()) {
            emailSubject = emailTemplate.subject.trim();
            console.log("[Notification Email] Using template subject:", emailSubject);
          } else {
            emailSubject = 'Notifica Sistema';
            console.log("[Notification Email] Using default subject:", emailSubject);
          }
          
          emailContent = shortText || 'Hai ricevuto una nuova notifica.';
          console.log("[Notification Email] Using form content:", emailContent);
        } else if (emailTemplate && emailTemplate.subject && emailTemplate.content) {
          // OTHER TEMPLATES: Use database template content - NEVER use frontend content
          emailSubject = emailTemplate.subject;
          emailContent = emailTemplate.content;
          console.log("[Notification Email] USING DATABASE TEMPLATE - ABSOLUTE PRIORITY");
          console.log("[Notification Email] Database template subject:", emailSubject);
          console.log("[Notification Email] Database template content preview:", emailContent.substring(0, 100) + "...");
        } else {
          // ONLY FALLBACK: Use frontend content when NO database template exists
          if (isLeaveResponse) {
            console.log("[Notification Email] CRITICAL: Leave response without database template detected");
            if (templateType === 'permessi-approvazione') {
              emailSubject = 'Richiesta Permesso Approvata';
              emailContent = 'La tua richiesta di permesso è stata approvata.';
            } else if (templateType === 'ferie-approvazione') {
              emailSubject = 'Richiesta Ferie Approvata';
              emailContent = 'La tua richiesta di ferie è stata approvata.';
            } else if (templateType === 'permessi-rifiuto') {
              emailSubject = 'Richiesta Permesso Rifiutata';
              emailContent = 'La tua richiesta di permesso è stata rifiutata.';
            } else if (templateType === 'ferie-rifiuto') {
              emailSubject = 'Richiesta Ferie Rifiutata';
              emailContent = 'La tua richiesta di ferie è stata rifiutata.';
            } else {
              emailSubject = subject || 'Notifica Leave Request';
              emailContent = shortText || 'Hai ricevuto una notifica.';
            }
            console.log("[Notification Email] Using minimal leave response fallback");
          } else {
            emailSubject = subject || 'Notifica Sistema';
            emailContent = shortText || 'Hai ricevuto una nuova notifica.';
          }
          console.log("[Notification Email] FALLBACK CONTENT - No database template found");
          console.log("[Notification Email] Using subject:", emailSubject);
          console.log("[Notification Email] Using content:", emailContent);
        }
        
        console.log("[Notification Email] EMAIL CONTENT BEFORE VARIABLE SUBSTITUTION:");
        console.log("  Subject:", emailSubject);
        console.log("  Content preview:", emailContent.substring(0, 100) + "...");
        console.log("  Employee name (sender):", employeeName || 'N/A');
        
        const recipientName = recipient.first_name && recipient.last_name 
          ? `${recipient.first_name} ${recipient.last_name}`
          : recipient.email;
        
        console.log("  Recipient name:", recipientName);
        
        // FIXED: Separate substitution for employee_name (sender) and recipient_name (recipient)
        const finalEmployeeName = employeeName || 'Dipendente';
        emailSubject = emailSubject.replace(/{employee_name}/g, finalEmployeeName);
        emailContent = emailContent.replace(/{employee_name}/g, finalEmployeeName);
        
        emailSubject = emailSubject.replace(/{recipient_name}/g, recipientName);
        emailContent = emailContent.replace(/{recipient_name}/g, recipientName);
        
        console.log("[Notification Email] EMAIL CONTENT AFTER VARIABLE SUBSTITUTION:");
        console.log("  Final subject:", emailSubject);
        console.log("  Final content preview:", emailContent.substring(0, 100) + "...");
        console.log("  Template database usage:", !!emailTemplate);
        console.log("  Admin message to pass:", finalAdminMessage);
        console.log("  Employee notes to pass:", employeeNote);
        console.log("  Template show_admin_notes setting:", templateData.show_admin_notes);

        // FIXED: Properly format leave details for ALL leave request and response types
        let leaveDetails = '';
        const isLeaveRequest = templateType === 'permessi-richiesta' || templateType === 'ferie-richiesta';
        
        if ((isLeaveRequest || isLeaveResponse) && emailBody) {
          leaveDetails = emailBody;
          console.log("[Notification Email] Leave-related email detected, formatting details:", leaveDetails);
        }

        console.log("[Notification Email] BUILDING HTML CONTENT WITH PARAMETERS:");
        console.log("  showAdminMessage:", templateData.show_admin_message);
        console.log("  adminMessage:", finalAdminMessage);
        console.log("  adminMessage length:", finalAdminMessage ? finalAdminMessage.length : 0);
        console.log("  Will show admin section:", templateData.show_admin_message && finalAdminMessage && finalAdminMessage.trim() !== '');

        const htmlContent = buildHtmlContent({
          subject: emailSubject,
          shortText: emailContent,
          logoUrl,
          attachmentSection,
          senderEmail,
          isDocumentEmail,
          templateType,
          primaryColor: templateData.primary_color,
          backgroundColor: templateData.background_color,
          textColor: templateData.text_color,
          logoAlignment,
          footerText: templateData.footer_text,
          footerColor: templateData.footer_color,
          fontFamily: templateData.font_family,
          buttonColor: templateData.button_color,
          buttonTextColor: templateData.button_text_color,
          borderRadius: templateData.border_radius,
          logoSize,
          headerAlignment: templateData.header_alignment,
          bodyAlignment: templateData.body_alignment,
          fontSize: templateData.font_size,
          showDetailsButton: templateData.show_details_button,
          showLeaveDetails: templateData.show_leave_details,
          showAdminNotes: templateData.show_admin_notes,
          leaveDetails: leaveDetails,
          adminNotes: isLeaveResponse ? (adminNote || '') : '',
          employeeNotes: isLeaveRequest ? (employeeNote || '') : '',
          leaveDetailsBgColor: templateData.leave_details_bg_color,
          leaveDetailsTextColor: templateData.leave_details_text_color,
          adminNotesBgColor: templateData.admin_notes_bg_color,
          adminNotesTextColor: templateData.admin_notes_text_color,
          showCustomBlock: templateData.show_custom_block,
          customBlockText: templateData.custom_block_text,
          customBlockBgColor: templateData.custom_block_bg_color,
          customBlockTextColor: templateData.custom_block_text_color,
          dynamicSubject: emailSubject,
          dynamicContent: emailContent,
          employeeEmail: employeeEmail,
          // FIXED: Show admin message for ALL templates that have it enabled
          showAdminMessage: templateData.show_admin_message,
          adminMessage: finalAdminMessage,
          adminMessageBgColor: templateData.admin_message_bg_color,
          adminMessageTextColor: templateData.admin_message_text_color,
          recipientName: recipientName,
          showButton: templateData.show_button,
          buttonText: templateData.button_text,
          buttonUrl: templateData.button_url,
        });

        console.log("[Notification Email] HTML CONTENT GENERATED SUCCESSFULLY");
        console.log("[Notification Email] HTML length:", htmlContent.length);

        // Email sending configuration
        const emailConfig: any = {
          sender: { email: senderEmail, name: senderName },
          to: [{ email: recipient.email, name: recipientName }],
          subject: emailSubject,
          htmlContent: htmlContent,
        };

        if (dynamicReplyTo) {
          emailConfig.replyTo = { email: dynamicReplyTo };
          console.log("[Notification Email] Setting reply-to:", dynamicReplyTo);
        }

        console.log("[Notification Email] FINAL EMAIL CONFIG:");
        console.log("  To:", recipient.email);
        console.log("  Subject:", emailSubject);
        console.log("  Sender:", senderEmail);
        console.log("  Reply-to:", dynamicReplyTo || "none");
        console.log("  HTML content length:", htmlContent.length);

        // CRITICAL: Send email via Brevo with enhanced error handling
        console.log("[Notification Email] SENDING EMAIL VIA BREVO...");
        
        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": adminSetting.brevo_api_key,
          },
          body: JSON.stringify(emailConfig),
        });

        console.log("[Notification Email] BREVO RESPONSE STATUS:", brevoResponse.status);
        console.log("[Notification Email] BREVO RESPONSE OK:", brevoResponse.ok);

        if (!brevoResponse.ok) {
          const errorText = await brevoResponse.text();
          console.error(`[Notification Email] Brevo API error for ${recipient.email}:`, errorText);
          console.error(`[Notification Email] Brevo response status: ${brevoResponse.status}`);
          console.error(`[Notification Email] Brevo response headers:`, Object.fromEntries(brevoResponse.headers.entries()));
          errors.push(`Failed to send to ${recipient.email}: ${errorText}`);
          continue;
        }

        const brevoResult = await brevoResponse.json();
        console.log("[Notification Email] BREVO SUCCESS RESULT:", brevoResult);
        console.log("[Notification Email] Email sent successfully to", recipient.email);
        successCount++;

      } catch (error) {
        console.error(`[Notification Email] Error sending email to ${recipient.email}:`, error);
        console.error(`[Notification Email] Error stack:`, error.stack);
        errors.push(`Failed to send to ${recipient.email}: ${error.message}`);
      }
    }

    console.log("[Notification Email] ===== EMAIL SENDING COMPLETED =====");
    console.log("[Notification Email] Success count:", successCount);
    console.log("[Notification Email] Total recipients:", recipients.length);
    console.log("[Notification Email] Errors count:", errors.length);
    console.log("[Notification Email] Errors:", errors);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emails sent to ${successCount} recipients`,
        totalRecipients: recipients.length,
        successCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("[Notification Email] ===== CRITICAL FUNCTION ERROR =====");
    console.error("[Notification Email] Error message:", error.message);
    console.error("[Notification Email] Error stack:", error.stack);
    console.error("[Notification Email] Error details:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to send notification email", 
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
