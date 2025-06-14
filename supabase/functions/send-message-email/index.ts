
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { emails, subject, body } = await req.json();
    if (!emails || emails.length === 0) throw new Error("Recipient(s) required");
    if (!subject || !body) throw new Error("Missing subject/body");

    const sent = await resend.emails.send({
      from: "Comunicazioni <no-reply@resend.dev>",
      to: emails,
      subject,
      html: `
        <h3>Nuova comunicazione aziendale</h3>
        <div><strong>Soggetto:</strong> ${subject}</div>
        <div style='margin:16px 0;'>${body}</div>
        <hr />
        <div style='color:#78716c;font-size:13px;'>Non rispondere a questa email, visita la tua Area Personale per leggere tutti i messaggi.</div>
      `,
    });

    return new Response(JSON.stringify(sent), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `${e}` }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
