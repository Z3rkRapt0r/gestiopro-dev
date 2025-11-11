import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildHtmlContent, buildAttachmentSection } from "./mailTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AttendanceAlert {
  id: string;
  employee_id: string;
  admin_id: string;
  alert_date: string;
  alert_time: string;
  expected_time: string;
  email_sent_at: string | null;
  employees: {
    first_name: string;
    last_name: string;
    email: string;
  };
  admin_settings: {
    resend_api_key: string;
    sender_name: string;
    sender_email: string;
    global_logo_url?: string;
    global_logo_alignment?: string;
    global_logo_size?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Attendance Monitor] Function started");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Recupera tutti gli avvisi non ancora inviati per oggi
    // Usa timezone europeo per essere consistente con il cron job
    const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Rome"})).toISOString().split('T')[0];
    const { data: alerts, error: alertsError } = await supabase
      .from("attendance_alerts")
      .select(`
        id,
        employee_id,
        admin_id,
        alert_date,
        alert_time,
        expected_time,
        email_sent_at
      `)
      .eq("alert_date", today)
      .is("email_sent_at", null);

    if (alertsError) {
      console.error("[Attendance Monitor] Error fetching alerts:", alertsError);
      return new Response(
        JSON.stringify({ error: "Errore nel recupero degli avvisi", details: alertsError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!alerts || alerts.length === 0) {
      console.log("[Attendance Monitor] No pending alerts found for today");
      return new Response(
        JSON.stringify({ message: "Nessun avviso pendente per oggi", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Attendance Monitor] Found ${alerts.length} pending alerts to process`);

    // Recupera i dati degli employee e admin settings separatamente
    const employeeIds = [...new Set(alerts.map(a => a.employee_id))];
    const adminIds = [...new Set(alerts.map(a => a.admin_id))];

    const [employeesData, adminSettingsData] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", employeeIds),
      supabase
        .from("admin_settings")
        .select("admin_id, resend_api_key, sender_name, sender_email, global_logo_url, global_logo_alignment, global_logo_size")
        .in("admin_id", adminIds)
    ]);

    if (employeesData.error || adminSettingsData.error) {
      console.error("[Attendance Monitor] Error fetching related data:", {
        employees: employeesData.error,
        adminSettings: adminSettingsData.error
      });
      return new Response(
        JSON.stringify({ error: "Errore nel recupero dei dati correlati" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Crea mappe per lookup rapido
    const employeesMap = new Map(employeesData.data?.map(emp => [emp.id, emp]) || []);
    const adminSettingsMap = new Map(adminSettingsData.data?.map(admin => [admin.admin_id, admin]) || []);

    // Combina i dati
    const enrichedAlerts = alerts.map(alert => ({
      ...alert,
      employees: employeesMap.get(alert.employee_id),
      admin_settings: adminSettingsMap.get(alert.admin_id)
    }));

    console.log(`[Attendance Monitor] Found ${enrichedAlerts.length} pending alerts to process`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Get email template from database for "avviso-entrata"
    const templateType = 'avviso-entrata';
    const templateCategory = 'amministratori';

    // Get unique admin IDs to fetch templates
    const uniqueAdminIds = [...new Set(enrichedAlerts.map(alert => alert.admin_id))];

    // Fetch email templates for all admins in one query
    const { data: emailTemplates, error: templatesError } = await supabase
      .from("email_templates")
      .select("*")
      .in("admin_id", uniqueAdminIds)
      .eq("template_type", templateType)
      .eq("template_category", templateCategory);

    if (templatesError) {
      console.error("[Attendance Monitor] Error fetching email templates:", templatesError);
    }

    // Create a map of templates by admin_id
    const templatesMap = new Map(emailTemplates?.map(t => [t.admin_id, t]) || []);

    console.log(`[Attendance Monitor] Found ${emailTemplates?.length || 0} email templates for admins`);

    for (const alert of enrichedAlerts as AttendanceAlert[]) {
      try {
        const employee = alert.employees;
        const adminSettings = alert.admin_settings;

        if (!employee || !adminSettings) {
          console.error(`[Attendance Monitor] Missing data for alert ${alert.id}`);
          errorCount++;
          results.push({ alert_id: alert.id, status: "error", reason: "Dati mancanti" });
          continue;
        }

        // Get template for this admin or use default
        const emailTemplate = templatesMap.get(alert.admin_id) || {
          primary_color: '#007bff',
          secondary_color: '#6c757d',
          background_color: '#ffffff',
          text_color: '#333333',
          footer_text: '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820',
          footer_color: '#888888',
          font_family: 'Arial, sans-serif',
          header_alignment: 'center',
          body_alignment: 'left',
          font_size: 'medium',
          border_radius: '6px',
          subject: 'Promemoria: Registrazione Entrata Mancante',
          content: `Gentile {employee_name},\nNotiamo che non hai ancora registrato la tua entrata per oggi.\n\nOrario previsto: {expected_time}\nOra corrente: {alert_time}\nData: {alert_date}\n\nTi preghiamo di registrare la tua presenza il prima possibile.\n\nGrazie,\nAmministrazione`,
          logo_alignment: 'center',
          logo_size: 'medium'
        };

        // Get logo URL
        let logoUrl = adminSettings.global_logo_url || emailTemplate.logo_url;
        if (!logoUrl) {
          const { data: logoData } = await supabase.storage
            .from('company-assets')
            .getPublicUrl(`${alert.admin_id}/email-logo.png?v=${Date.now()}`);
          logoUrl = logoData?.publicUrl;
        }

        const logoAlignment = adminSettings.global_logo_alignment || emailTemplate.logo_alignment || 'center';
        const logoSize = adminSettings.global_logo_size || emailTemplate.logo_size || 'medium';

        // Prepare email data with template variables replaced
        const employeeName = `${employee.first_name} ${employee.last_name}`;
        const recipientName = employeeName;

        // Replace variables in subject and content
        let emailSubject = emailTemplate.subject || 'Promemoria: Registrazione Entrata Mancante';
        let emailContent = emailTemplate.content || `Gentile {employee_name},\nNotiamo che non hai ancora registrato la tua entrata per oggi.`;

        emailSubject = emailSubject
          .replace(/\{employee_name\}/gi, employeeName)
          .replace(/\{alert_date\}/gi, alert.alert_date)
          .replace(/\{alert_time\}/gi, alert.alert_time)
          .replace(/\{expected_time\}/gi, alert.expected_time);

        emailContent = emailContent
          .replace(/\{employee_name\}/gi, employeeName)
          .replace(/\{recipient_name\}/gi, recipientName)
          .replace(/\{alert_date\}/gi, alert.alert_date)
          .replace(/\{alert_time\}/gi, alert.alert_time)
          .replace(/\{expected_time\}/gi, alert.expected_time)
          .replace(/\{current_date\}/gi, new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }));

        console.log(`[Attendance Monitor] Building HTML for alert ${alert.id}`);

        // Build HTML using template system
        const attachmentSection = buildAttachmentSection(null, emailTemplate.primary_color || '#007bff');

        const htmlContent = buildHtmlContent({
          subject: emailSubject,
          shortText: emailContent,
          logoUrl: logoUrl || '',
          attachmentSection,
          senderEmail: adminSettings.sender_email,
          isDocumentEmail: false,
          templateType: 'avviso-entrata',
          primaryColor: emailTemplate.primary_color || '#007bff',
          backgroundColor: emailTemplate.background_color || '#ffffff',
          textColor: emailTemplate.text_color || '#333333',
          logoAlignment,
          footerText: emailTemplate.footer_text || '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820',
          footerColor: emailTemplate.footer_color || '#888888',
          fontFamily: emailTemplate.font_family || 'Arial, sans-serif',
          logoSize,
          headerAlignment: emailTemplate.header_alignment || 'center',
          bodyAlignment: emailTemplate.body_alignment || 'left',
          fontSize: emailTemplate.font_size || 'medium',
          showLeaveDetails: false,
          showAdminNotes: false,
          leaveDetails: '',
          adminNotes: '',
          employeeNotes: '',
          leaveDetailsBgColor: emailTemplate.leave_details_bg_color || '#e3f2fd',
          leaveDetailsTextColor: emailTemplate.leave_details_text_color || '#1565c0',
          adminNotesBgColor: emailTemplate.admin_notes_bg_color || '#f8f9fa',
          adminNotesTextColor: emailTemplate.admin_notes_text_color || '#495057',
          showCustomBlock: emailTemplate.show_custom_block || false,
          customBlockText: emailTemplate.custom_block_text || '',
          customBlockBgColor: emailTemplate.custom_block_bg_color || '#fff3cd',
          customBlockTextColor: emailTemplate.custom_block_text_color || '#856404',
          dynamicSubject: emailSubject,
          dynamicContent: emailContent,
          recipientName,
        });

        console.log(`[Attendance Monitor] HTML built successfully for alert ${alert.id}, length: ${htmlContent?.length || 0}`);

        // Invia email via Resend
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminSettings.resend_api_key}`,
          },
          body: JSON.stringify({
            from: `${adminSettings.sender_name} <${adminSettings.sender_email}>`,
            to: [employee.email],
            subject: emailSubject,
            html: htmlContent
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`[Attendance Monitor] Email send failed for ${alert.id}:`, errorText);
          errorCount++;
          results.push({ alert_id: alert.id, status: "error", reason: `Email API error: ${errorText}` });
          continue;
        }

        // Aggiorna il record per marcare l'email come inviata
        const { error: updateError } = await supabase
          .from("attendance_alerts")
          .update({
            email_sent_at: new Date().toISOString()
          })
          .eq("id", alert.id);

        if (updateError) {
          console.error(`[Attendance Monitor] Failed to update alert ${alert.id}:`, updateError);
          errorCount++;
          results.push({ alert_id: alert.id, status: "error", reason: `Database update error: ${updateError.message}` });
          continue;
        }

        successCount++;
        results.push({ alert_id: alert.id, status: "success" });
        console.log(`[Attendance Monitor] Successfully sent alert to ${employee.email}`);

      } catch (error) {
        console.error(`[Attendance Monitor] Unexpected error processing alert ${alert.id}:`, error);
        errorCount++;
        results.push({ alert_id: alert.id, status: "error", reason: error.message });
      }
    }

    console.log(`[Attendance Monitor] Processing complete: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        message: `Elaborazione completata: ${successCount} email inviate, ${errorCount} errori`,
        processed: enrichedAlerts.length,
        success: successCount,
        errors: errorCount,
        results
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Attendance Monitor] Critical error:", error);
    return new Response(
      JSON.stringify({ error: "Errore critico del sistema", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
