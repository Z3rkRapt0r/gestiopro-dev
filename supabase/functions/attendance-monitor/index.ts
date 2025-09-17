import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
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
    const today = new Date().toISOString().split('T')[0];
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
        .select("admin_id, resend_api_key, sender_name, sender_email")
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

        // Genera email personalizzata
        const emailTemplate = generateAttendanceAlertEmail({
          employeeName: `${employee.first_name} ${employee.last_name}`,
          expectedTime: alert.expected_time,
          alertTime: alert.alert_time,
          alertDate: alert.alert_date
        });

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
            subject: emailTemplate.subject,
            html: emailTemplate.html
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

function generateAttendanceAlertEmail(data: {
  employeeName: string;
  expectedTime: string;
  alertTime: string;
  alertDate: string;
}): EmailTemplate {
  const subject = `🔔 Avviso: Registrazione Entrata Mancante - ${data.alertDate}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Avviso Registrazione Entrata</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔔</div>
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Avviso Registrazione Entrata</h1>
                <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Sistema di Gestione Presenze</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
                <p style="font-size: 18px; color: #374151; margin: 0 0 20px 0;">Gentile <strong>${data.employeeName}</strong>,</p>

                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <p style="margin: 0; color: #92400e; font-size: 16px; line-height: 1.6;">
                        <strong>Attenzione:</strong> Non abbiamo registrato la tua entrata oggi <strong>${data.alertDate}</strong>.
                    </p>
                </div>

                <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <h3 style="margin: 0 0 15px 0; color: #0c4a6e; font-size: 18px;">📋 Dettagli Registrazione</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e0f2fe; color: #374151; font-weight: 500;">Orario Previsto:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e0f2fe; color: #0c4a6e; font-weight: 600; text-align: right;">${data.expectedTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e0f2fe; color: #374151; font-weight: 500;">Ora Avviso:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e0f2fe; color: #dc2626; font-weight: 600; text-align: right;">${data.alertTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #374151; font-weight: 500;">Data:</td>
                            <td style="padding: 8px 0; color: #0c4a6e; font-weight: 600; text-align: right;">${data.alertDate}</td>
                        </tr>
                    </table>
                </div>

                <div style="background-color: #f0fdf4; border: 1px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 18px;">✅ Azioni Richieste</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #166534;">
                        <li style="margin-bottom: 8px;">Registra la tua entrata nel sistema di gestione presenze</li>
                        <li style="margin-bottom: 8px;">Verifica che l'orario sia corretto</li>
                        <li>Contatta il tuo responsabile se hai problemi tecnici</li>
                    </ul>
                </div>

                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                    Questo è un messaggio automatico del sistema di gestione presenze. Se hai già registrato la tua entrata, puoi ignorare questo avviso.
                </p>

                <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                    Cordiali saluti,<br>
                    <strong>Sistema di Gestione Presenze</strong>
                </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                    Questo messaggio è stato inviato automaticamente. Non rispondere a questa email.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;

  return { subject, html };
}
