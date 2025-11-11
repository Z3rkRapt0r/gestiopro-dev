import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildHtmlContent, buildAttachmentSection } from "./mailTemplates.ts";

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
  global_logo_url?: string;
  global_logo_alignment?: string;
  global_logo_size?: string;
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
      .select("admin_id, attendance_alert_enabled, attendance_alert_delay_minutes, resend_api_key, sender_name, sender_email, global_logo_url, global_logo_alignment, global_logo_size")
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

        // Ottieni gli orari aziendali di default
        const { data: companySchedule, error: scheduleError } = await supabase
          .from("work_schedules")
          .select("*")
          .single();

        if (scheduleError) {
          console.error(`[Check Missing Attendance] Error fetching company schedule:`, scheduleError);
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

  // Use template from database or defaults
  const template = emailTemplate || {
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
    subject: defaultSubject,
    content: defaultContent,
    logo_alignment: 'center',
    logo_size: 'medium'
  };

  const subject = template.subject || defaultSubject;
  const content = template.content || defaultContent;

  // Sostituisci i placeholder
  const employeeName = `${employee.first_name} ${employee.last_name}`.trim();
  const recipientName = employeeName;

  const personalizedSubject = subject
    .replace(/{employee_name}/gi, employeeName)
    .replace(/{recipient_name}/gi, recipientName)
    .replace(/{expected_time}/gi, employee.expectedTime)
    .replace(/{current_time}/gi, currentTime)
    .replace(/{alert_time}/gi, currentTime)
    .replace(/{alert_date}/gi, new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }));

  const personalizedContent = content
    .replace(/{employee_name}/gi, employeeName)
    .replace(/{recipient_name}/gi, recipientName)
    .replace(/{expected_time}/gi, employee.expectedTime)
    .replace(/{current_time}/gi, currentTime)
    .replace(/{alert_time}/gi, currentTime)
    .replace(/{alert_date}/gi, new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }));

  // Get logo URL
  let logoUrl = admin.global_logo_url || template.logo_url;
  if (!logoUrl) {
    const { data: logoData } = await supabase.storage
      .from('company-assets')
      .getPublicUrl(`${admin.admin_id}/email-logo.png?v=${Date.now()}`);
    logoUrl = logoData?.publicUrl;
  }

  const logoAlignment = admin.global_logo_alignment || template.logo_alignment || 'center';
  const logoSize = admin.global_logo_size || template.logo_size || 'medium';

  console.log(`[Check Missing Attendance] Building HTML for employee ${employee.id}`);

  // Build HTML using template system
  const attachmentSection = buildAttachmentSection(null, template.primary_color || '#007bff');

  const htmlContent = buildHtmlContent({
    subject: personalizedSubject,
    shortText: personalizedContent,
    logoUrl: logoUrl || '',
    attachmentSection,
    senderEmail: admin.sender_email,
    isDocumentEmail: false,
    templateType: 'avviso-entrata',
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
    showLeaveDetails: false,
    showAdminNotes: false,
    leaveDetails: '',
    adminNotes: '',
    employeeNotes: '',
    leaveDetailsBgColor: template.leave_details_bg_color || '#e3f2fd',
    leaveDetailsTextColor: template.leave_details_text_color || '#1565c0',
    adminNotesBgColor: template.admin_notes_bg_color || '#f8f9fa',
    adminNotesTextColor: template.admin_notes_text_color || '#495057',
    showCustomBlock: template.show_custom_block || false,
    customBlockText: template.custom_block_text || '',
    customBlockBgColor: template.custom_block_bg_color || '#fff3cd',
    customBlockTextColor: template.custom_block_text_color || '#856404',
    dynamicSubject: personalizedSubject,
    dynamicContent: personalizedContent,
    recipientName,
  });

  console.log(`[Check Missing Attendance] HTML built successfully for employee ${employee.id}, length: ${htmlContent?.length || 0}`);

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
      html: htmlContent,
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
