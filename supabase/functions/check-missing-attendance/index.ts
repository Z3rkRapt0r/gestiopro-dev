import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_work_schedules?: {
    work_days: string[];
    start_time: string;
    end_time: string;
  }[];
}

interface AdminSettings {
  admin_id: string;
  attendance_alert_enabled: boolean;
  attendance_alert_delay_minutes: number;
  resend_api_key: string;
  sender_name: string;
  sender_email: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Check Missing Attendance] Function started");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verifica se c'è un trigger pending per oggi
    const currentDateString = new Date().toISOString().split('T')[0];
    const { data: trigger, error: triggerError } = await supabase
      .from("attendance_check_triggers")
      .select("*")
      .eq("trigger_date", currentDateString)
      .eq("status", "pending")
      .single();

    if (triggerError && triggerError.code !== 'PGRST116') {
      console.error("[Check Missing Attendance] Error checking trigger:", triggerError);
    }

    if (!trigger) {
      console.log("[Check Missing Attendance] No pending trigger found for today");
      return new Response(JSON.stringify({ message: "No pending trigger for today" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Marca il trigger come in elaborazione
    await supabase
      .from("attendance_check_triggers")
      .update({ status: "processing" })
      .eq("trigger_date", currentDateString);

    // Ottieni tutti gli admin con il controllo entrate abilitato
    const { data: adminSettings, error: adminError } = await supabase
      .from("admin_settings")
      .select("admin_id, attendance_alert_enabled, attendance_alert_delay_minutes, resend_api_key, sender_name, sender_email")
      .eq("attendance_alert_enabled", true)
      .not("resend_api_key", "is", null);

    if (adminError) {
      console.error("[Check Missing Attendance] Error fetching admin settings:", adminError);
      throw adminError;
    }

    if (!adminSettings || adminSettings.length === 0) {
      console.log("[Check Missing Attendance] No admins with attendance alert enabled");
      return new Response(JSON.stringify({ message: "No admins with attendance alert enabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const results = [];
    const currentDate = new Date();
    const currentTime = currentDate.toTimeString().slice(0, 5); // HH:MM format
    const dayOfWeek = currentDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[dayOfWeek];

    console.log(`[Check Missing Attendance] Current time: ${currentTime}, day: ${currentDayName}`);

    // Controllo globale: recupera gli orari aziendali per determinare il range di controllo
    const { data: companySchedule, error: scheduleError } = await supabase
      .from("work_schedules")
      .select("*")
      .single();

    if (scheduleError) {
      console.error("[Check Missing Attendance] Error fetching company schedule:", scheduleError);
      // Fallback: usa orari di default se non riusciamo a recuperare quelli aziendali
      if (currentDate.getHours() >= 22 || currentDate.getHours() < 6) {
        console.log(`[Check Missing Attendance] Outside default business hours (${currentDate.getHours()}:00), skipping attendance checks`);
        return new Response(JSON.stringify({
          message: "Outside default business hours, skipping attendance checks",
          currentHour: currentDate.getHours()
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } else {
      // Calcola il range dinamico basato sugli orari aziendali
      const [startHour] = companySchedule.start_time.split(':').map(Number);
      const [endHour] = companySchedule.end_time.split(':').map(Number);

      // Range di controllo: da 1 ora prima dell'inizio fino a 2 ore dopo la fine
      const checkStartHour = Math.max(0, startHour - 1); // Non va sotto la mezzanotte
      const checkEndHour = Math.min(23, endHour + 2); // Non va sopra le 23:00

      const currentHour = currentDate.getHours();

      if (currentHour < checkStartHour || currentHour > checkEndHour) {
        console.log(`[Check Missing Attendance] Outside company business hours (${currentHour}:00 not in ${checkStartHour}:00-${checkEndHour}:00), skipping attendance checks`);
        return new Response(JSON.stringify({
          message: "Outside company business hours, skipping attendance checks",
          currentHour,
          companySchedule: { startHour, endHour },
          checkRange: { checkStartHour, checkEndHour }
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    for (const admin of adminSettings as AdminSettings[]) {
      try {
        console.log(`[Check Missing Attendance] Processing admin: ${admin.admin_id}`);

        // Ottieni tutti i dipendenti attivi
        const { data: employees, error: employeesError } = await supabase
          .from("profiles")
          .select(`
            id,
            first_name,
            last_name,
            email,
            employee_work_schedules (
              work_days,
              start_time,
              end_time
            )
          `)
          .eq("role", "employee")
          .eq("is_active", true);

        if (employeesError) {
          console.error(`[Check Missing Attendance] Error fetching employees for admin ${admin.admin_id}:`, employeesError);
          continue;
        }

        // Usa gli orari aziendali recuperati all'inizio (sono globali per l'azienda)
        // Se non sono stati recuperati, salta questo admin
        if (!companySchedule) {
          console.log(`[Check Missing Attendance] No company schedule available for admin ${admin.admin_id}, skipping`);
          continue;
        }

        const employeesToAlert = [];

        for (const employee of employees as Employee[]) {
          // Determina gli orari di lavoro (personalizzati o aziendali)
          const workSchedule = employee.employee_work_schedules?.[0] || companySchedule;
          
          if (!workSchedule) {
            console.log(`[Check Missing Attendance] No work schedule for employee ${employee.id}`);
            continue;
          }

          // Verifica se oggi è un giorno lavorativo
          let isWorkingDay = false;
          if (employee.employee_work_schedules?.[0]) {
            // Orari personalizzati
            isWorkingDay = employee.employee_work_schedules[0].work_days.includes(currentDayName);
          } else {
            // Orari aziendali
            isWorkingDay = companySchedule[currentDayName as keyof typeof companySchedule] as boolean;
          }

          if (!isWorkingDay) {
            console.log(`[Check Missing Attendance] Employee ${employee.id} not working today`);
            continue;
          }

          // Verifica se il dipendente è in ferie o permesso oggi
          const currentDateString = currentDate.toISOString().split('T')[0];
          const { data: leaveRequests, error: leaveError } = await supabase
            .from("leave_requests")
            .select("*")
            .eq("user_id", employee.id)
            .eq("status", "approved")
            .or(`and(type.eq.ferie,date_from.lte.${currentDateString},date_to.gte.${currentDateString}),and(type.eq.permesso,day.eq.${currentDateString})`);

          if (leaveError) {
            console.error(`[Check Missing Attendance] Error checking leave for employee ${employee.id}:`, leaveError);
            continue;
          }

          if (leaveRequests && leaveRequests.length > 0) {
            console.log(`[Check Missing Attendance] Employee ${employee.id} is on leave today`);
            continue;
          }

          // Calcola se è il momento di inviare l'avviso
          const startTime = workSchedule.start_time;
          const [startHour, startMinute] = startTime.split(':').map(Number);
          const alertTime = new Date();
          alertTime.setHours(startHour, startMinute + admin.attendance_alert_delay_minutes, 0, 0);

          if (currentDate < alertTime) {
            console.log(`[Check Missing Attendance] Too early to alert employee ${employee.id}`);
            continue;
          }

          // Verifica se ha già registrato l'entrata oggi
          const { data: attendance, error: attendanceError } = await supabase
            .from("attendances")
            .select("*")
            .eq("user_id", employee.id)
            .eq("date", currentDate.toISOString().split('T')[0])
            .not("check_in_time", "is", null);

          if (attendanceError) {
            console.error(`[Check Missing Attendance] Error checking attendance for employee ${employee.id}:`, attendanceError);
            continue;
          }

          if (attendance && attendance.length > 0) {
            console.log(`[Check Missing Attendance] Employee ${employee.id} already checked in`);
            continue;
          }

          // Verifica se abbiamo già inviato un avviso oggi
          const { data: existingAlert, error: alertError } = await supabase
            .from("attendance_alerts")
            .select("*")
            .eq("employee_id", employee.id)
            .eq("alert_date", currentDate.toISOString().split('T')[0]);

          if (alertError) {
            console.error(`[Check Missing Attendance] Error checking existing alerts for employee ${employee.id}:`, alertError);
            continue;
          }

          if (existingAlert && existingAlert.length > 0) {
            console.log(`[Check Missing Attendance] Alert already sent today for employee ${employee.id}`);
            continue;
          }

          employeesToAlert.push({
            ...employee,
            expectedTime: startTime,
            workSchedule
          });
        }

        console.log(`[Check Missing Attendance] Found ${employeesToAlert.length} employees to alert for admin ${admin.admin_id}`);

        // Invia gli avvisi
        for (const employee of employeesToAlert) {
          try {
            await sendAttendanceAlert(supabase, admin, employee, currentTime);
            
            // Registra che abbiamo inviato l'avviso
            await supabase
              .from("attendance_alerts")
              .insert({
                employee_id: employee.id,
                admin_id: admin.admin_id,
                alert_date: currentDate.toISOString().split('T')[0],
                alert_time: currentTime,
                expected_time: employee.expectedTime
              });

            results.push({
              admin_id: admin.admin_id,
              employee_id: employee.id,
              employee_name: `${employee.first_name} ${employee.last_name}`.trim(),
              status: "sent"
            });
          } catch (error) {
            console.error(`[Check Missing Attendance] Error sending alert to employee ${employee.id}:`, error);
            results.push({
              admin_id: admin.admin_id,
              employee_id: employee.id,
              employee_name: `${employee.first_name} ${employee.last_name}`.trim(),
              status: "error",
              error: error.message
            });
          }
        }
      } catch (error) {
        console.error(`[Check Missing Attendance] Error processing admin ${admin.admin_id}:`, error);
      }
    }

    // Marca il trigger come completato
    await supabase
      .from("attendance_check_triggers")
      .update({ status: "completed" })
      .eq("trigger_date", currentDateString);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      processedAt: currentDate.toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("[Check Missing Attendance] Function error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

async function sendAttendanceAlert(supabase: any, admin: AdminSettings, employee: any, currentTime: string) {
  // Ottieni il template email personalizzato
  const { data: emailTemplate, error: templateError } = await supabase
    .from("email_templates")
    .select("*")
    .eq("admin_id", admin.admin_id)
    .eq("template_type", "avviso-entrata")
    .eq("template_category", "amministratori")
    .maybeSingle();

  if (templateError) {
    console.error("Error fetching email template:", templateError);
  }

  // Template di default se non personalizzato
  const defaultSubject = "Promemoria: Registrazione Entrata Mancante";
  const defaultContent = `Gentile {employee_name},

Notiamo che non hai ancora registrato la tua entrata per oggi.

Orario previsto: {expected_time}
Orario attuale: {current_time}

Ti ricordiamo di registrare la tua presenza il prima possibile.

Grazie per la collaborazione.`;

  const subject = emailTemplate?.subject || defaultSubject;
  const content = emailTemplate?.content || defaultContent;

  // Sostituisci i placeholder
  const employeeName = `${employee.first_name} ${employee.last_name}`.trim();
  const personalizedSubject = subject
    .replace(/{employee_name}/g, employeeName)
    .replace(/{expected_time}/g, employee.expectedTime)
    .replace(/{current_time}/g, currentTime);

  const personalizedContent = content
    .replace(/{employee_name}/g, employeeName)
    .replace(/{expected_time}/g, employee.expectedTime)
    .replace(/{current_time}/g, currentTime);

  // Invia l'email tramite Resend
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${admin.resend_api_key}`,
    },
    body: JSON.stringify({
      from: `${admin.sender_name} <${admin.sender_email}>`,
      to: [employee.email],
      subject: personalizedSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f97316; margin-bottom: 20px;">⚠️ Promemoria Registrazione Entrata</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #f97316;">
            ${personalizedContent.replace(/\n/g, '<br>')}
          </div>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d;">
            Questo è un messaggio automatico del sistema di gestione presenze.
          </div>
        </div>
      `,
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    throw new Error(`Resend API error: ${emailResponse.status} - ${errorText}`);
  }

  const result = await emailResponse.json();
  console.log(`[Check Missing Attendance] Email sent successfully to ${employee.email}:`, result);
  
  return result;
}
