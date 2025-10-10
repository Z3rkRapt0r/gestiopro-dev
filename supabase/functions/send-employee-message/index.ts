import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Employee Message] Starting function");

  try {
    const { subject, message, employeeId, employeeName } = await req.json();
    
    console.log("[Employee Message] Request:", { subject, message, employeeId, employeeName });

    if (!subject || !message || !employeeId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch all admin users (service role has full access)
    console.log("[Employee Message] Fetching admin users with service role...");
    const { data: admins, error: adminsError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, role, is_active")
      .or("role.eq.admin,role.eq.administrator")
      .eq("is_active", true);

    if (adminsError) {
      console.error("[Employee Message] Error fetching admins:", adminsError);
      throw adminsError;
    }

    console.log("[Employee Message] Admins found:", admins?.length || 0);

    if (!admins || admins.length === 0) {
      console.error("[Employee Message] No admins found");
      return new Response(
        JSON.stringify({ error: "No administrators found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create notifications for each admin
    const notificationsToInsert = admins.map(admin => ({
      user_id: admin.id,
      title: `Messaggio da ${employeeName}: ${subject}`,
      message: message,
      type: 'message',
      category: 'employee_message',
      created_by: employeeId,
      is_read: false
    }));

    console.log("[Employee Message] Creating notifications:", notificationsToInsert.length);
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert(notificationsToInsert);

    if (notificationError) {
      console.error("[Employee Message] Error creating notifications:", notificationError);
      throw notificationError;
    }

    console.log("[Employee Message] Notifications created successfully");

    // 3. Send email notifications with rate limiting
    let emailsSent = 0;
    for (const admin of admins) {
      try {
        // Add delay to respect Resend rate limit (2 requests per second)
        if (emailsSent > 0) {
          const delay = Math.ceil(1000 / 2); // 500ms delay between requests
          console.log(`[Employee Message] Adding ${delay}ms delay to respect rate limit...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.log(`[Employee Message] Sending email to ${admin.email}...`);
        const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
          body: {
            recipientEmail: admin.email,
            recipientName: `${admin.first_name} ${admin.last_name}`,
            subject: `Nuovo messaggio da ${employeeName}`,
            message: message,
            notificationType: 'employee_message',
            senderName: employeeName,
            messageTitle: subject
          }
        });

        if (emailError) {
          console.error(`[Employee Message] Error sending email to ${admin.email}:`, emailError);
        } else {
          console.log(`[Employee Message] Email sent successfully to ${admin.email}`);
          emailsSent++;
        }
      } catch (emailError) {
        console.error(`[Employee Message] Failed to send email to ${admin.email}:`, emailError);
      }
    }

    console.log(`[Employee Message] Process complete. Emails sent: ${emailsSent}/${admins.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        adminsNotified: admins.length,
        emailsSent: emailsSent
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Employee Message] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

