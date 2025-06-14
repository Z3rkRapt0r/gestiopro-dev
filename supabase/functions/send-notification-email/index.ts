
// Edge Function versione Brevo con logging per debug

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { recipientId, subject, shortText, notificationId, userId } = body;

    // Log input ricevuto
    console.log("[Edge] Ricevuto body:", body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Recupero chiave Brevo salvata per admin (userId)
    console.log("[Edge] Cerco admin_settings per admin_id:", userId);

    const { data: adminSetting, error } = await supabase
      .from("admin_settings")
      .select("brevo_api_key")
      .eq("admin_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[Edge] Errore query admin_settings:", error);
    }
    if (!adminSetting) {
      console.error(
        "[Edge] admin_settings non trovato per admin_id:",
        userId
      );
      return new Response(JSON.stringify({ error: "Impostazione Brevo non trovata per admin", admin_id: userId }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[Edge] adminSetting trovato:", adminSetting);

    const brevoApiKey = adminSetting.brevo_api_key;

    // Recupero email destinatari
    let emails: string[] = [];
    if (recipientId) {
      const { data } = await supabase.from("profiles").select("email").eq("id", recipientId).maybeSingle();
      if (data?.email) emails = [data.email];
    } else {
      const { data } = await supabase.from("profiles").select("email").eq("is_active", true);
      emails = (data || []).map((d: any) => d.email).filter(Boolean);
    }

    console.log("[Edge] Email destinatari:", emails);

    // INVIO MAIL via API Brevo
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: { name: "Notifiche", email: "notifiche@yourdomain.com" }, // personalizzalo se serve!
        to: emails.map(email => ({ email })),
        subject,
        htmlContent: `<h2>${subject}</h2><p>${shortText}</p>`,
        textContent: shortText,
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error("[Edge] Errore risposta Brevo:", errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[Edge] Email inviata con successo");

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[Edge] Errore generale:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

