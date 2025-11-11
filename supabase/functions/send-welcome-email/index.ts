import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WelcomeEmailPayload {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  tempPassword?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Welcome Email] Function started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WelcomeEmailPayload = await req.json();
    console.log('[Welcome Email] Received payload:', { ...payload, tempPassword: '***' });

    const { employeeId, email, firstName, lastName, tempPassword } = payload;

    if (!employeeId || !email) {
      throw new Error('employeeId e email sono obbligatori');
    }

    // Get sender settings and Resend API key from admin_settings table
    const { data: adminSettings, error: adminError } = await supabase
      .from('admin_settings')
      .select('admin_id, sender_name, sender_email, resend_api_key')
      .single();

    if (adminError || !adminSettings) {
      console.error('[Welcome Email] No admin settings found:', adminError);
      throw new Error('Configurazione sender non trovata');
    }

    if (!adminSettings.resend_api_key) {
      console.error('[Welcome Email] No Resend API key configured');
      throw new Error('Resend API key non configurata');
    }

    const senderName = adminSettings.sender_name || 'Sistema Gestionale';
    const senderEmail = adminSettings.sender_email || 'noreply@example.com';
    const resendApiKey = adminSettings.resend_api_key;

    console.log('[Welcome Email] Using Resend sender:', `${senderName} <${senderEmail}>`);

    // Get email template for new employee
    console.log('[Welcome Email] Looking for template: nuovo-dipendente');
    const { data: emailTemplate, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("admin_id", adminSettings.admin_id)
      .eq("template_type", "nuovo-dipendente")
      .maybeSingle();

    if (templateError) {
      console.error("[Welcome Email] Error fetching template:", templateError);
      throw templateError;
    }

    // If no custom template, use default
    let subject = 'Benvenuto in Gestiopro!';
    let htmlContent = '';

    if (emailTemplate) {
      console.log("[Welcome Email] Using custom template:", emailTemplate.name);

      const employeeName = `${firstName || ''} ${lastName || ''}`.trim() || 'Nuovo Dipendente';
      const safeFooterText = emailTemplate.footer_text || '© Sistema di Gestione Aziendale';

      subject = emailTemplate.subject
        .replace(/\{employeeName\}/g, employeeName);

      htmlContent = emailTemplate.content
        .replace(/\{employeeName\}/g, employeeName)
        .replace(/\{email\}/g, email)
        .replace(/\{tempPassword\}/g, tempPassword || '***')
        .replace(/\{footerText\}/g, safeFooterText);

      // Apply template styling
      htmlContent = htmlContent
        .replace(/\{primaryColor\}/g, emailTemplate.primary_color || '#007bff')
        .replace(/\{secondaryColor\}/g, emailTemplate.secondary_color || '#6c757d')
        .replace(/\{backgroundColor\}/g, emailTemplate.background_color || '#ffffff')
        .replace(/\{textColor\}/g, emailTemplate.text_color || '#333333')
        .replace(/\{footerColor\}/g, emailTemplate.footer_color || '#888888')
        .replace(/\{fontFamily\}/g, emailTemplate.font_family || 'Arial, sans-serif');
    } else {
      console.log("[Welcome Email] No custom template found, using default");

      const employeeName = `${firstName || ''} ${lastName || ''}`.trim() || 'Nuovo Dipendente';

      subject = `Benvenuto in Gestiopro, ${employeeName}!`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px 30px; text-align: center; background-color: #007bff; color: #ffffff; border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; font-size: 28px;">Benvenuto in Gestiopro!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #333333;">
                        Ciao <strong>${employeeName}</strong>,
                      </p>
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #333333;">
                        Il tuo account è stato creato con successo! Ecco i tuoi dati di accesso:
                      </p>
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8f9fa; border-radius: 4px;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                              <strong>Email:</strong> ${email}
                            </p>
                            ${tempPassword ? `
                            <p style="margin: 0; font-size: 14px; color: #666666;">
                              <strong>Password temporanea:</strong> ${tempPassword}
                            </p>
                            ` : ''}
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 20px 0; font-size: 16px; line-height: 1.5; color: #333333;">
                        Ti consigliamo di cambiare la password al primo accesso per motivi di sicurezza.
                      </p>
                      <p style="margin: 20px 0; font-size: 16px; line-height: 1.5; color: #333333;">
                        Potrai gestire le tue presenze, ferie, permessi e documenti direttamente dalla piattaforma.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 30px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0; font-size: 12px; color: #888888;">
                        © Sistema di Gestione Aziendale - Gestiopro
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    }

    console.log('[Welcome Email] Prepared email:', { subject, to: email });

    // Send email via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [email],
        subject,
        html: htmlContent,
        reply_to: senderEmail,
      }),
    });

    console.log('[Welcome Email] Resend API response status:', resendResponse.status);

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('[Welcome Email] Resend API error:', errorText);
      throw new Error(`Resend API error: ${resendResponse.status} - ${errorText}`);
    }

    const emailResponse = await resendResponse.json();
    console.log('[Welcome Email] Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        data: emailResponse
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('[Welcome Email] Error:', error);
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
