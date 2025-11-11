import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { buildHtmlContent, buildAttachmentSection } from './mailTemplates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeaveRequestEmailPayload {
  recipientId?: string; // null = all admins, specific ID = specific recipient
  employeeName: string;
  leaveType: 'ferie' | 'permesso';
  leaveDetails: string;
  adminNote?: string; // For approval/rejection responses
  isApproval?: boolean;
  isRejection?: boolean;
  employeeNote?: string; // For new requests
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Leave Request Email] Function started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: LeaveRequestEmailPayload = await req.json();
    console.log('[Leave Request Email] Received payload:', payload);

    const {
      recipientId,
      employeeName,
      leaveType,
      leaveDetails,
      adminNote,
      isApproval = false,
      isRejection = false,
      employeeNote
    } = payload;

    // Get sender settings and Resend API key from admin_settings table
    const { data: adminSettings, error: adminError } = await supabase
      .from('admin_settings')
      .select('admin_id, sender_name, sender_email, resend_api_key, global_logo_url, global_logo_alignment, global_logo_size')
      .single();

    if (adminError || !adminSettings) {
      console.error('[Leave Request Email] No admin settings found:', adminError);
      throw new Error('Configurazione sender non trovata');
    }

    if (!adminSettings.resend_api_key) {
      console.error('[Leave Request Email] No Resend API key configured');
      throw new Error('Resend API key non configurata');
    }

    const senderName = adminSettings.sender_name || 'Sistema Gestionale';
    const senderEmail = adminSettings.sender_email || 'noreply@example.com';
    const resendApiKey = adminSettings.resend_api_key;

    console.log('[Leave Request Email] Using Resend sender:', `${senderName} <${senderEmail}>`);

    // Determine recipients
    let recipients: string[] = [];

    if (recipientId) {
      // Send to specific user (for approvals/rejections)
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', recipientId)
        .single();

      if (userError || !userProfile) {
        console.error('[Leave Request Email] User not found:', userError);
        throw new Error('Destinatario non trovato');
      }

      recipients = [userProfile.email];
      console.log('[Leave Request Email] Sending to specific user:', userProfile.email);
    } else {
      // Send to all admins (for new requests)
      const { data: adminProfiles, error: adminsError } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'admin')
        .eq('is_active', true);

      if (adminsError || !adminProfiles?.length) {
        console.error('[Leave Request Email] No admin recipients found:', adminsError);
        throw new Error('Nessun amministratore trovato');
      }

      recipients = adminProfiles.map(admin => admin.email);
      console.log('[Leave Request Email] Sending to all admins:', recipients);
    }

    // Determine template type and category based on email type
    let templateType: string;
    let templateCategory: string;

    if (isApproval) {
      templateType = `${leaveType}-approvazione`;
      templateCategory = 'dipendenti'; // Send to employee
    } else if (isRejection) {
      templateType = `${leaveType}-rifiuto`;
      templateCategory = 'dipendenti'; // Send to employee
    } else {
      templateType = `${leaveType}-richiesta`;
      templateCategory = 'amministratori'; // Send to admins
    }

    // Get email template from database
    console.log(`[Leave Request Email] Looking for template: ${templateType}, ${templateCategory}`);
    const { data: emailTemplate, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("admin_id", adminSettings.admin_id)
      .eq("template_type", templateType)
      .eq("template_category", templateCategory)
      .maybeSingle();

    if (templateError) {
      console.error("[Leave Request Email] Error fetching template:", templateError);
      throw templateError;
    }

    // Template data handling - prioritize database template or use minimal fallback
    let templateData;
    if (emailTemplate) {
      templateData = emailTemplate;
      console.log("[Leave Request Email] Using custom template from database");
    } else {
      // Minimal fallback template with basic styling only
      templateData = {
        primary_color: '#007bff',
        secondary_color: '#6c757d',
        background_color: '#ffffff',
        text_color: '#333333',
        logo_alignment: 'center',
        logo_size: 'medium',
        footer_text: '© A.L.M Infissi - Sistema di Gestione Aziendale',
        footer_color: '#888888',
        header_alignment: 'center',
        body_alignment: 'left',
        font_family: 'Arial, sans-serif',
        font_size: 'medium',
        button_color: '#007bff',
        button_text_color: '#ffffff',
        border_radius: '6px',
        show_leave_details: true,
        show_admin_notes: true,
        admin_notes_bg_color: '#f8f9fa',
        admin_notes_text_color: '#495057',
        leave_details_bg_color: '#e3f2fd',
        leave_details_text_color: '#1565c0',
        subject: `Richiesta ${leaveType}`,
        content: `Richiesta ${leaveType} da {employeeName}`
      };
      console.log("[Leave Request Email] No custom template found, using minimal fallback styling");
    }

    // Use global logo settings if available, otherwise fallback to template or default
    let logoUrl = adminSettings.global_logo_url;
    let logoAlignment = adminSettings.global_logo_alignment || templateData.logo_alignment || 'center';
    let logoSize = adminSettings.global_logo_size || templateData.logo_size || 'medium';

    if (!logoUrl) {
      logoUrl = templateData.logo_url;
      if (!logoUrl) {
        const { data: logoData } = await supabase.storage
          .from('company-assets')
          .getPublicUrl(`${adminSettings.admin_id}/email-logo.png?v=${Date.now()}`);
        logoUrl = logoData?.publicUrl;
      }
    }

    console.log("[Leave Request Email] Using logoUrl:", logoUrl);

    // Prepare safe values
    const safeEmployeeName = employeeName || 'Dipendente';
    const safeLeaveDetails = leaveDetails || 'Nessun dettaglio disponibile';
    const safeEmployeeNote = employeeNote || '';
    const safeAdminNote = adminNote || '';

    // Build subject with ALL variable name variants
    let subject = templateData.subject || `Richiesta ${leaveType}`;
    subject = subject
      .replace(/\{employeeName\}/gi, safeEmployeeName)
      .replace(/\{employee_name\}/gi, safeEmployeeName);

    // Build content with ALL variable name variants (camelCase, snake_case, both cases)
    let content = templateData.content || `Hai ricevuto una richiesta di ${leaveType} da {employeeName}`;
    content = content
      // Employee name variants
      .replace(/\{employeeName\}/gi, safeEmployeeName)
      .replace(/\{employee_name\}/gi, safeEmployeeName)
      // Leave details variants
      .replace(/\{leaveDetails\}/gi, safeLeaveDetails)
      .replace(/\{leave_details\}/gi, safeLeaveDetails)
      // Employee note variants
      .replace(/\{employeeNote\}/gi, safeEmployeeNote)
      .replace(/\{employee_note\}/gi, safeEmployeeNote)
      // Admin note/message variants
      .replace(/\{adminNote\}/gi, safeAdminNote)
      .replace(/\{admin_note\}/gi, safeAdminNote)
      .replace(/\{adminMessage\}/gi, safeAdminNote)
      .replace(/\{admin_message\}/gi, safeAdminNote);

    console.log('[Leave Request Email] Building HTML content with buildHtmlContent');

    // Build HTML using buildHtmlContent for consistent styling
    const isLeaveRequest = !isApproval && !isRejection;
    const isLeaveResponse = isApproval || isRejection;

    // Build attachment section (empty for leave requests)
    const attachmentSection = buildAttachmentSection(null, templateData.primary_color || '#007bff');

    const htmlContent = buildHtmlContent({
      subject,
      shortText: content,
      logoUrl: logoUrl || '',
      attachmentSection,
      senderEmail,
      isDocumentEmail: false,
      templateType,
      primaryColor: templateData.primary_color || '#007bff',
      backgroundColor: templateData.background_color || '#ffffff',
      textColor: templateData.text_color || '#333333',
      logoAlignment,
      footerText: templateData.footer_text || '© A.L.M Infissi - Sistema di Gestione Aziendale',
      footerColor: templateData.footer_color || '#888888',
      fontFamily: templateData.font_family || 'Arial, sans-serif',
      logoSize,
      headerAlignment: templateData.header_alignment || 'center',
      bodyAlignment: templateData.body_alignment || 'left',
      fontSize: templateData.font_size || 'medium',
      showLeaveDetails: templateData.show_leave_details !== false,
      showAdminNotes: templateData.show_admin_notes !== false && isLeaveResponse,
      leaveDetails: isLeaveRequest || isLeaveResponse ? safeLeaveDetails : '',
      adminNotes: isLeaveResponse ? safeAdminNote : '',
      employeeNotes: isLeaveRequest ? safeEmployeeNote : '',
      leaveDetailsBgColor: templateData.leave_details_bg_color || '#e3f2fd',
      leaveDetailsTextColor: templateData.leave_details_text_color || '#1565c0',
      adminNotesBgColor: templateData.admin_notes_bg_color || '#f8f9fa',
      adminNotesTextColor: templateData.admin_notes_text_color || '#495057',
      showCustomBlock: templateData.show_custom_block || false,
      customBlockText: templateData.custom_block_text || '',
      customBlockBgColor: templateData.custom_block_bg_color || '#fff3cd',
      customBlockTextColor: templateData.custom_block_text_color || '#856404',
      dynamicSubject: subject,
      dynamicContent: content,
      recipientName: safeEmployeeName,
      showAdminMessage: false,
      adminMessage: '',
      adminMessageBgColor: templateData.admin_message_bg_color || '#e3f2fd',
      adminMessageTextColor: templateData.admin_message_text_color || '#1565c0',
    });

    console.log('[Leave Request Email] HTML content generated, length:', htmlContent?.length || 0);
    console.log('[Leave Request Email] Prepared email:', { subject, recipientCount: recipients.length });

    // Add delay to respect Resend rate limit (2 requests per second)
    if (recipients.length > 1) {
      const delay = Math.ceil(1000 / 2); // 500ms delay between requests
      console.log(`[Leave Request Email] Adding ${delay}ms delay to respect rate limit...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Send email via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: recipients,
        subject,
        html: htmlContent,
        reply_to: senderEmail,
      }),
    });

    console.log('[Leave Request Email] Resend API response status:', resendResponse.status);

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('[Leave Request Email] Resend API error:', errorText);
      throw new Error(`Resend API error: ${resendResponse.status} - ${errorText}`);
    }

    const emailResponse = await resendResponse.json();
    console.log('[Leave Request Email] Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        data: emailResponse,
        recipients: recipients.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('[Leave Request Email] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
