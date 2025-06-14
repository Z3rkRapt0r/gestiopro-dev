
// Edge Function: invio email tramite Resend
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { recipientId, subject, shortText, notificationId } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // recupera l’email del destinatario (o tutte le email attive se null)
    let emails: string[] = [];
    if (recipientId) {
      const { data } = await supabase.from("profiles").select("email").eq("id", recipientId).maybeSingle();
      if (data?.email) emails = [data.email];
    } else {
      const { data } = await supabase.from("profiles").select("email").eq("is_active", true);
      emails = (data || []).map((d: any) => d.email).filter(Boolean);
    }

    // Crea link notifica (assumi dominio)
    const baseUrl = Deno.env.get("BASE_URL") || "https://YOUR_APP_URL";
    const link = `${baseUrl}/`; // in futuro: /notification/${notificationId}

    await resend.emails.send({
      from: "Notifiche <onboarding@resend.dev>",
      to: emails,
      subject,
      html: `
        <h2>${subject}</h2>
        <p>${shortText}</p>
        <p>
          <a href="${link}" target="_blank">Accedi alla notifica</a>
        </p>
      `,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
