
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

    const { recipientId, subject, shortText, userId, topic, body: emailBody, adminNote, employeeEmail, employeeName, employeeNote } = body;

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

    // ENHANCED TEMPLATE TYPE MAPPING - Now includes all template types
    let templateType = 'notifiche'; // default
    let templateCategory = 'generale'; // default
    
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
      const lowerSubject = subject.toLowerCase();
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
          templateCategory = 'dipendenti';
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
          templateCategory = 'dipendenti';
        }
      }
    }

    console.log("[Notification Email] Template mapping - Type:", templateType, "Category:", templateCategory, "Topic:", topic);

    // Get email template for the specific template type and category
    console.log("[Notification Email] Looking for email template:", templateType, templateCategory);
    const { data: emailTemplate, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("admin_id", adminSettingsUserId)
      .eq("template_type", templateType)
      .eq("template_category", templateCategory)
      .maybeSingle();

    if (templateError) {
      console.error("[Notification Email] Error fetching email template:", templateError);
    }

    console.log("[Notification Email] Template query result:", emailTemplate ? "Found custom template" : "No custom template found");
    
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
        show_details_button: false,
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
        // Admin notes section
        show_admin_notes_section: true,
        admin_notes_section_bg_color: '#e8f4fd',
        admin_notes_section_text_color: '#2c5282',
      };
      console.log("[Notification Email] No custom template found, using minimal fallback styling only");
    }

    // Use global logo settings if available, otherwise fallback to template or default
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

    console.log("[Notification Email] Using logoUrl:", logoUrl);
    console.log("[Notification Email] Logo settings - alignment:", logoAlignment, "size:", logoSize);

    // Get recipients list - FIXED: Only admin for employee requests
    let recipients = [];
    console.log("[Notification Email] Determining recipients for recipientId:", recipientId, "templateType:", templateType);
    
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

    console.log("[Notification Email] Recipients found:", recipients.length);

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

    console.log("[Notification Email] Using sender:", senderName, "<" + senderEmail + ">");

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

    for (const recipient of recipients) {
      try {
        console.log("[Notification Email] Preparing email for recipient:", recipient.email);
        
        const attachmentSection = buildAttachmentSection(null, templateData.primary_color);
        
        const isDocumentEmail = templateType === 'documenti';
        const isNotificationEmail = templateType === 'notifiche';
        
        // ABSOLUTE PRIORITY: Database template content
        let emailSubject, emailContent;
        
        if (emailTemplate && emailTemplate.subject && emailTemplate.content) {
          // ABSOLUTE PRIORITY: Use database template content
          emailSubject = emailTemplate.subject;
          emailContent = emailTemplate.content;
          console.log("[Notification Email] ABSOLUTE PRIORITY: Using database template subject and content");
        } else {
          // FALLBACK ONLY: Use frontend content when no database template exists
          emailSubject = subject || 'Notifica Sistema';
          emailContent = shortText || 'Hai ricevuto una nuova notifica.';
          console.log("[Notification Email] FALLBACK: Using frontend content - no database template found");
        }
        
        // ENHANCED VARIABLE SUBSTITUTION WITH DETAILED LOGGING
        console.log("[Notification Email] Starting variable substitution for template type:", templateType);
        console.log("[Notification Email] Employee name provided:", employeeName);
        console.log("[Notification Email] Employee note provided:", employeeNote);
        console.log("[Notification Email] Admin note provided:", adminNote || emailBody);
        
        // Replace {employee_name} with enhanced logging
        if (employeeName) {
          const originalSubject = emailSubject;
          const originalContent = emailContent;
          
          emailSubject = emailSubject.replace(/{employee_name}/g, employeeName);
          emailContent = emailContent.replace(/{employee_name}/g, employeeName);
          
          console.log("[Notification Email] Enhanced employee name substitution:");
          console.log("  Template type:", templateType);
          console.log("  Original subject:", originalSubject);
          console.log("  Final subject:", emailSubject);
          console.log("  Employee name used:", employeeName);
          console.log("  Subject changed:", originalSubject !== emailSubject);
          console.log("  Content changed:", originalContent !== emailContent);
        } else {
          console.log("[Notification Email] No employee name provided for substitution");
        }
        
        // Replace recipient name in content
        if (recipient.first_name && recipient.last_name) {
          const recipientName = `${recipient.first_name} ${recipient.last_name}`;
          emailContent = emailContent.replace(/Gentile [^,]+,/g, `Gentile ${recipientName},`);
          emailContent = emailContent.replace(/Gentile Admin Sistema,/g, `Gentile ${recipientName},`);
          console.log("[Notification Email] Replaced recipient greeting with:", recipientName);
        }
        
        // Replace employee notes for employee request templates
        if (templateType.includes('richiesta') && employeeNote) {
          emailContent = emailContent.replace(/{employee_note}/g, employeeNote);
          console.log("[Notification Email] Replaced employee note for request template");
        } else if (templateType.includes('richiesta')) {
          emailContent = emailContent.replace(/{employee_note}/g, 'Nessuna nota aggiuntiva.');
        }
        
        // Replace leave details for leave request templates
        if (['permessi-richiesta', 'ferie-richiesta', 'permessi-approvazione', 'ferie-approvazione', 'permessi-rifiuto', 'ferie-rifiuto'].includes(templateType) && emailBody) {
          emailContent = emailContent.replace(/{leave_details}/g, emailBody);
          console.log("[Notification Email] Replaced leave details for template type:", templateType);
        }
        
        // Replace admin notes for approval/rejection templates AND document templates
        const adminNoteContent = adminNote || emailBody;
        if (adminNoteContent) {
          if (['permessi-approvazione', 'ferie-approvazione', 'permessi-rifiuto', 'ferie-rifiuto'].includes(templateType)) {
            emailContent = emailContent.replace(/{admin_note}/g, adminNoteContent);
            console.log("[Notification Email] Replaced admin note for leave template type:", templateType);
          } else if (templateType === 'documenti' && templateCategory === 'dipendenti') {
            emailContent = emailContent.replace(/{admin_note}/g, adminNoteContent);
            console.log("[Notification Email] Replaced admin note for document template");
          }
        } else if (emailContent.includes('{admin_note}')) {
          emailContent = emailContent.replace(/{admin_note}/g, '');
          console.log("[Notification Email] No admin note provided, removing placeholder");
        }
        
        // Prepare structured data for HTML template
        let leaveDetails = '';
        let adminNotes = '';
        let employeeNotes = '';
        let adminNotesForSection = '';
        
        if (['permessi-richiesta', 'ferie-richiesta', 'permessi-approvazione', 'ferie-approvazione', 'permessi-rifiuto', 'ferie-rifiuto'].includes(templateType) && emailBody) {
          leaveDetails = emailBody;
        }
        
        if (['permessi-approvazione', 'ferie-approvazione', 'permessi-rifiuto', 'ferie-rifiuto'].includes(templateType) && (adminNote || emailBody)) {
          adminNotes = adminNote || emailBody;
        }
        
        if (['permessi-richiesta', 'ferie-richiesta'].includes(templateType) && employeeNote) {
          employeeNotes = employeeNote;
        }

        // Admin notes section for document templates
        if (templateType === 'documenti' && (adminNote || emailBody)) {
          adminNotesForSection = adminNote || emailBody;
          console.log("[Notification Email] Admin notes for document section:", adminNotesForSection);
        }
        
        console.log("[Notification Email] Final email subject:", emailSubject);
        console.log("[Notification Email] Final email content preview:", emailContent.substring(0, 150) + "...");
        console.log("[Notification Email] Template database usage:", !!emailTemplate);
        
        const htmlContent = buildHtmlContent({
          subject: emailSubject,
          shortText: emailContent,
          logoUrl,
          attachmentSection,
          senderEmail,
          isDocumentEmail: isDocumentEmail || isNotificationEmail,
          templateType,
          primaryColor: templateData.primary_color,
          backgroundColor: templateData.background_color,
          textColor: templateData.text_color,
          logoAlignment: logoAlignment,
          footerText: templateData.footer_text,
          footerColor: templateData.footer_color,
          fontFamily: templateData.font_family,
          buttonColor: templateData.button_color,
          buttonTextColor: templateData.button_text_color,
          borderRadius: templateData.border_radius,
          logoSize: logoSize,
          headerAlignment: templateData.header_alignment,
          bodyAlignment: templateData.text_alignment || templateData.body_alignment,
          fontSize: templateData.font_size,
          showDetailsButton: false, // Always false now
          showLeaveDetails: templateData.show_leave_details,
          showAdminNotes: templateData.show_admin_notes,
          leaveDetails,
          adminNotes,
          employeeNotes,
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
          // Admin notes section
          showAdminNotesSection: templateData.show_admin_notes_section,
          adminNotesSection: adminNotesForSection,
          adminNotesSectionBgColor: templateData.admin_notes_section_bg_color,
          adminNotesSectionTextColor: templateData.admin_notes_section_text_color,
        });

        // Build Brevo payload with configured sender settings
        const brevoPayload: any = {
          sender: { name: senderName, email: senderEmail },
          to: [{ email: recipient.email }],
          subject: emailSubject,
          htmlContent,
          textContent: `${emailSubject}\n\n${emailContent}\n\nInviato da: ${senderName}`
        };

        if (dynamicReplyTo) {
          brevoPayload.replyTo = { email: dynamicReplyTo };
          console.log("[Notification Email] Setting reply-to:", dynamicReplyTo);
        }

        console.log("[Notification Email] Sending email to:", recipient.email, "with sender:", senderEmail);

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
          console.log(`[Notification Email] Email sent successfully to ${recipient.email}`);
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

    console.log("[Notification Email] Email sending completed!");
    console.log("[Notification Email] Success count:", successCount);
    console.log("[Notification Email] Errors:", errors);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        recipients: successCount,
        sender: `${senderName} <${senderEmail}>`,
        replyTo: dynamicReplyTo,
        templateType: templateType,
        templateCategory: templateCategory,
        templateUsed: !!emailTemplate,
        templateContent: emailTemplate ? "Database template (ABSOLUTE PRIORITY)" : "Frontend fallback",
        templatePriority: emailTemplate ? "Database template content used exclusively" : "Frontend fallback content used",
        adminNotesHandling: {
          isDocumentTemplate: templateType === 'documenti',
          hasAdminNoteContent: !!(adminNote || emailBody),
          adminNotesProcessed: !!(templateType === 'documenti' && (adminNote || emailBody)),
          adminNotesUsed: adminNotesForSection || 'None',
        },
        variableSubstitution: {
          employeeName: employeeName || "Not provided",
          employeeNameSubstituted: !!employeeName,
          employeeNote: employeeNote || "Not provided",
          employeeNoteSubstituted: !!employeeNote,
          adminNote: (adminNote || emailBody) || "Not provided",
          adminNoteSubstituted: !!(adminNote || emailBody)
        },
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
