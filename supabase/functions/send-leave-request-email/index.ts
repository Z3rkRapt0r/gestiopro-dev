import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Get sender settings from admin_settings table
    const { data: adminSettings, error: adminError } = await supabase
      .from('admin_settings')
      .select('sender_name, sender_email')
      .single();

    if (adminError || !adminSettings) {
      console.error('[Leave Request Email] No admin settings found:', adminError);
      throw new Error('Configurazione sender non trovata');
    }

    const senderName = adminSettings.sender_name || 'Sistema Gestionale';
    const senderEmail = adminSettings.sender_email || 'noreply@example.com';

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

    // Build email content
    let subject: string;
    let htmlContent: string;

    if (isApproval) {
      subject = `✅ Richiesta ${leaveType} approvata`;
      htmlContent = buildApprovalEmail(employeeName, leaveType, leaveDetails, adminNote);
    } else if (isRejection) {
      subject = `❌ Richiesta ${leaveType} rifiutata`;
      htmlContent = buildRejectionEmail(employeeName, leaveType, leaveDetails, adminNote);
    } else {
      subject = `📋 Nuova richiesta ${leaveType} da ${employeeName}`;
      htmlContent = buildNewRequestEmail(employeeName, leaveType, leaveDetails, employeeNote);
    }

    console.log('[Leave Request Email] Prepared email:', { subject, recipientCount: recipients.length });

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: recipients,
      subject,
      html: htmlContent,
      replyTo: senderEmail,
    });

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

function buildNewRequestEmail(
  employeeName: string, 
  leaveType: string, 
  leaveDetails: string, 
  employeeNote?: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📋 Nuova Richiesta ${leaveType === 'ferie' ? 'Ferie' : 'Permesso'}</h1>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Gentile Amministratore,<br><br>
          È stata ricevuta una nuova richiesta di ${leaveType === 'ferie' ? 'ferie' : 'permesso'} da <strong>${employeeName}</strong>.
        </p>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #007bff;">📅 Dettagli Richiesta</h3>
          <div style="font-size: 14px; white-space: pre-line;">${leaveDetails}</div>
        </div>
        
        ${employeeNote ? `
        <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #856404;">💬 Note del Dipendente</h3>
          <div style="font-size: 14px; white-space: pre-line;">${employeeNote}</div>
        </div>
        ` : ''}
        
        <!-- Button removed as requested -->
      </div>
      
      <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
        © A.L.M Infissi - Sistema di Gestione Aziendale
      </div>
    </div>
  `;
}

function buildApprovalEmail(
  employeeName: string, 
  leaveType: string, 
  leaveDetails: string, 
  adminNote?: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">✅ Richiesta Approvata</h1>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Caro/a <strong>${employeeName}</strong>,<br><br>
          La tua richiesta di ${leaveType === 'ferie' ? 'ferie' : 'permesso'} è stata <strong style="color: #28a745;">APPROVATA</strong>.
        </p>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #007bff;">📅 Dettagli Richiesta</h3>
          <div style="font-size: 14px; white-space: pre-line;">${leaveDetails}</div>
        </div>
        
        ${adminNote ? `
        <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin-bottom: 20px; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #155724;">💬 Note dell'Amministratore</h3>
          <div style="font-size: 14px; white-space: pre-line;">${adminNote}</div>
        </div>
        ` : ''}
        
        <!-- Button removed as requested -->
      </div>
      
      <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
        © A.L.M Infissi - Sistema di Gestione Aziendale
      </div>
    </div>
  `;
}

function buildRejectionEmail(
  employeeName: string, 
  leaveType: string, 
  leaveDetails: string, 
  adminNote?: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">❌ Richiesta Rifiutata</h1>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Caro/a <strong>${employeeName}</strong>,<br><br>
          La tua richiesta di ${leaveType === 'ferie' ? 'ferie' : 'permesso'} è stata <strong style="color: #dc3545;">RIFIUTATA</strong>.
        </p>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #007bff;">📅 Dettagli Richiesta</h3>
          <div style="font-size: 14px; white-space: pre-line;">${leaveDetails}</div>
        </div>
        
        ${adminNote ? `
        <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin-bottom: 20px; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #721c24;">💬 Motivo del Rifiuto</h3>
          <div style="font-size: 14px; white-space: pre-line;">${adminNote}</div>
        </div>
        ` : ''}
        
        <p style="font-size: 14px; color: #6c757d; margin-top: 20px;">
          Per ulteriori chiarimenti, contatta l'amministrazione.
        </p>
        
        <!-- Button removed as requested -->
      </div>
      
      <div style="background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
        © A.L.M Infissi - Sistema di Gestione Aziendale
      </div>
    </div>
  `;
}