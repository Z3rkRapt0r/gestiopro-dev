import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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
      .select('admin_id, sender_name, sender_email, resend_api_key')
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

    if (!emailTemplate) {
      console.error(`[Leave Request Email] No template found for ${templateType}/${templateCategory}`);
      return new Response(
        JSON.stringify({ error: `Email template not found: ${templateType}/${templateCategory}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Leave Request Email] Using template:", emailTemplate.name);

    // Replace template variables with safe fallbacks
    const safeEmployeeName = employeeName || 'Dipendente';
    const safeLeaveDetails = leaveDetails || 'Nessun dettaglio disponibile';
    const safeEmployeeNote = employeeNote || '';
    const safeAdminNote = adminNote || '';
    const safeFooterText = emailTemplate.footer_text || '© A.L.M Infissi - Sistema di Gestione Aziendale';
    
    let subject = emailTemplate.subject
      .replace(/\{employeeName\}/g, safeEmployeeName);
    
    let htmlContent = emailTemplate.content
      .replace(/\{employeeName\}/g, safeEmployeeName)
      .replace(/\{leaveDetails\}/g, safeLeaveDetails)
      .replace(/\{employeeNote\}/g, safeEmployeeNote)
      .replace(/\{adminNote\}/g, safeAdminNote)
      .replace(/\{footerText\}/g, safeFooterText);

    // Apply template styling
    htmlContent = htmlContent
      .replace(/\{primaryColor\}/g, emailTemplate.primary_color || '#007bff')
      .replace(/\{secondaryColor\}/g, emailTemplate.secondary_color || '#6c757d')
      .replace(/\{backgroundColor\}/g, emailTemplate.background_color || '#ffffff')
      .replace(/\{textColor\}/g, emailTemplate.text_color || '#333333')
      .replace(/\{footerColor\}/g, emailTemplate.footer_color || '#888888')
      .replace(/\{fontFamily\}/g, emailTemplate.font_family || 'Arial, sans-serif');

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