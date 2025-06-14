
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Brevo Email] Starting email function");
  console.log("[Brevo Email] Request method:", req.method);
  console.log("[Brevo Email] Request headers:", Object.fromEntries(req.headers.entries()));

  try {
    // Parse request body
    let body;
    try {
      const rawBody = await req.text();
      console.log("[Brevo Email] Raw request body:", rawBody);
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("[Brevo Email] Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Brevo Email] Parsed request body:", JSON.stringify(body, null, 2));

    // Extract parameters with fallbacks
    const { recipientId, subject, shortText, userId } = body;

    console.log("[Brevo Email] Extracted parameters:");
    console.log("- recipientId:", recipientId);
    console.log("- subject:", subject);
    console.log("- shortText:", shortText);
    console.log("- userId:", userId);

    // Validation
    if (!userId) {
      console.error("[Brevo Email] Missing userId in request");
      return new Response(
        JSON.stringify({ error: "Missing userId parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subject) {
      console.error("[Brevo Email] Missing subject in request");
      return new Response(
        JSON.stringify({ error: "Missing subject parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!shortText) {
      console.error("[Brevo Email] Missing shortText in request");
      return new Response(
        JSON.stringify({ error: "Missing shortText parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Brevo API key for admin
    console.log("[Brevo Email] Looking for admin settings for user:", userId);
    
    const { data: adminSetting, error: settingsError } = await supabase
      .from("admin_settings")
      .select("brevo_api_key")
      .eq("admin_id", userId)
      .single();

    if (settingsError) {
      console.error("[Brevo Email] Error fetching admin settings:", settingsError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch admin settings", 
          details: settingsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!adminSetting?.brevo_api_key) {
      console.error("[Brevo Email] No Brevo API key found for admin:", userId);
      return new Response(
        JSON.stringify({ 
          error: "No Brevo API key configured for this admin. Please configure it in the admin settings." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Brevo Email] Found Brevo API key for admin");

    // Get recipient emails
    let emails: string[] = [];
    
    if (recipientId && recipientId !== "ALL") {
      console.log("[Brevo Email] Getting single recipient email:", recipientId);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", recipientId)
        .single();

      if (profileError) {
        console.error("[Brevo Email] Error fetching recipient profile:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch recipient profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (profile?.email) {
        emails = [profile.email];
      }
    } else {
      console.log("[Brevo Email] Getting all active user emails");
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("email")
        .eq("is_active", true)
        .not("email", "is", null);

      if (profilesError) {
        console.error("[Brevo Email] Error fetching profiles:", profilesError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch user profiles" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      emails = (profiles || [])
        .map(p => p.email)
        .filter(Boolean);
    }

    if (emails.length === 0) {
      console.error("[Brevo Email] No valid email addresses found");
      return new Response(
        JSON.stringify({ error: "No valid email addresses found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Brevo Email] Sending to emails:", emails);

    // Send email via Brevo API
    const brevoPayload = {
      sender: { 
        name: "Sistema Notifiche", 
        email: "noreply@company.com" 
      },
      to: emails.map(email => ({ email })),
      subject: subject,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            ${subject}
          </h2>
          <div style="margin: 20px 0; line-height: 1.6; color: #555;">
            ${shortText.replace(/\n/g, '<br>')}
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #888; margin: 0;">
            Questa è una notifica automatica dal sistema aziendale.
          </p>
        </div>
      `,
      textContent: shortText
    };

    console.log("[Brevo Email] Calling Brevo API with payload:", JSON.stringify(brevoPayload, null, 2));

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": adminSetting.brevo_api_key,
      },
      body: JSON.stringify(brevoPayload),
    });

    const brevoResponseText = await brevoResponse.text();
    console.log("[Brevo Email] Brevo response status:", brevoResponse.status);
    console.log("[Brevo Email] Brevo response body:", brevoResponseText);

    if (!brevoResponse.ok) {
      console.error("[Brevo Email] Brevo API error:", brevoResponse.status, brevoResponseText);
      
      let errorMessage = "Failed to send email via Brevo";
      try {
        const errorData = JSON.parse(brevoResponseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = brevoResponseText || errorMessage;
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: brevoResponse.status,
          details: brevoResponseText
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Brevo Email] Email sent successfully!");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        recipients: emails.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Brevo Email] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
