// =========================================
// ✅ NUOVA EDGE FUNCTION CONTROLLA PRESENZE (ITALIANO)
// =========================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("🚀 Edge Function Controlla Presenze avviata")

serve(async (req) => {
  // Header CORS per permettere chiamate dal database
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Gestione richiesta OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("📅 Inizio processamento avvisi presenze...")

    // Connessione a Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Data odierna
    const dataOdierna = new Date().toISOString().split('T')[0]
    console.log(`📆 Data odierna: ${dataOdierna}`)

    // 1. RECUPERA AVVISI PENDENTI (non ancora inviati)
    console.log("🔍 Ricerca avvisi pendenti...")
    const { data: avvisiPendenti, error: erroreAvvisi } = await supabase
      .from("attendance_alerts")
      .select(`
        *,
        profiles:employee_id (
          first_name,
          last_name,
          email
        ),
        admin_settings:admin_id (
          attendance_alert_enabled,
          attendance_alert_delay_minutes,
          resend_api_key,
          sender_name,
          sender_email
        )
      `)
      .eq("alert_date", dataOdierna)
      .is("email_sent_at", null) // Solo avvisi NON ancora inviati

    if (erroreAvvisi) {
      console.error("❌ Errore nel recupero avvisi:", erroreAvvisi)
      throw erroreAvvisi
    }

    console.log(`📊 Trovati ${avvisiPendenti?.length || 0} avvisi pendenti`)

    // Se non ci sono avvisi pendenti, termina
    if (!avvisiPendenti || avvisiPendenti.length === 0) {
      console.log("✅ Nessun avviso da inviare oggi")
      return new Response(JSON.stringify({
        messaggio: "Nessun avviso da inviare",
        dataProcessamento: new Date().toISOString(),
        avvisiProcessati: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    console.log(`📤 Invio ${avvisiPendenti.length} avvisi...`)

    // 2. PROCESSA OGNI AVVISO
    const risultati = []
    const oraAttuale = new Date().toTimeString().slice(0, 5) // HH:MM

    for (const avviso of avvisiPendenti) {
      try {
        console.log(`👤 Processamento avviso per dipendente ${avviso.employee_id}`)

        // Verifica che l'amministratore sia ancora abilitato
        if (!avviso.admin_settings?.attendance_alert_enabled) {
          console.log(`⚠️ Amministratore ${avviso.admin_id} non più abilitato`)
          continue
        }

        // Verifica che abbia la chiave API
        if (!avviso.admin_settings?.resend_api_key) {
          console.log(`⚠️ Amministratore ${avviso.admin_id} senza chiave API`)
          continue
        }

        // Verifica che il dipendente esista ancora
        if (!avviso.profiles) {
          console.log(`⚠️ Dipendente ${avviso.employee_id} non trovato`)
          continue
        }

        // Prepara dati dipendente
        const dipendente = {
          id: avviso.employee_id,
          nome: avviso.profiles.first_name,
          cognome: avviso.profiles.last_name,
          email: avviso.profiles.email,
          orarioPrevisto: avviso.expected_time
        }

        const amministratore = avviso.admin_settings

        console.log(`📧 Invio email a ${dipendente.nome} ${dipendente.cognome} (${dipendente.email})`)

        // 3. INVIA EMAIL
        const successoInvio = await inviaEmailAvviso(supabase, amministratore, dipendente, oraAttuale)

        if (successoInvio) {
          // 4. MARCA AVVISO COME INVIATO
          const { error: erroreAggiornamento } = await supabase
            .from("attendance_alerts")
            .update({
              email_sent_at: new Date().toISOString()
            })
            .eq("id", avviso.id)

          if (erroreAggiornamento) {
            console.error(`❌ Errore aggiornamento avviso ${avviso.id}:`, erroreAggiornamento)
            risultati.push({
              id_avviso: avviso.id,
              id_dipendente: avviso.employee_id,
              nome_dipendente: `${dipendente.nome} ${dipendente.cognome}`.trim(),
              stato: "errore",
              errore: `Invio riuscito ma errore aggiornamento: ${erroreAggiornamento.message}`
            })
          } else {
            console.log(`✅ Avviso inviato con successo a ${dipendente.nome} ${dipendente.cognome}`)
            risultati.push({
              id_avviso: avviso.id,
              id_dipendente: avviso.employee_id,
              nome_dipendente: `${dipendente.nome} ${dipendente.cognome}`.trim(),
              stato: "inviato"
            })
          }
        } else {
          console.error(`❌ Fallito invio email a ${dipendente.nome} ${dipendente.cognome}`)
          risultati.push({
            id_avviso: avviso.id,
            id_dipendente: avviso.employee_id,
            nome_dipendente: `${dipendente.nome} ${dipendente.cognome}`.trim(),
            stato: "errore_invio"
          })
        }

      } catch (errore) {
        console.error(`❌ Errore processamento avviso ${avviso.id}:`, errore)
        risultati.push({
          id_avviso: avviso.id,
          id_dipendente: avviso.employee_id,
          nome_dipendente: `${avviso.profiles?.first_name} ${avviso.profiles?.last_name}`.trim(),
          stato: "errore",
          errore: errore.message
        })
      }
    }

    // 5. RISPOSTA FINALE
    const inviati = risultati.filter(r => r.stato === "inviato").length
    const errori = risultati.filter(r => r.stato !== "inviato").length

    console.log(`🎯 Processamento completato: ${inviati} inviati, ${errori} errori`)

    return new Response(JSON.stringify({
      successo: true,
      messaggio: `Processati ${risultati.length} avvisi`,
      risultati,
      inviati,
      errori,
      dataProcessamento: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })

  } catch (errore) {
    console.error("💥 Errore generale Edge Function:", errore)
    return new Response(JSON.stringify({
      successo: false,
      errore: errore.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }
})

// =========================================
// 📧 FUNZIONE INVIO EMAIL
// =========================================
async function inviaEmailAvviso(supabase: any, amministratore: any, dipendente: any, oraAttuale: string) {
  try {
    console.log(`📤 Preparazione email per ${dipendente.email}...`)

    // Contenuto email
    const oggetto = `🔔 Avviso Mancanza Presenza - ${oraAttuale}`
    
    const corpoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Avviso Mancanza Presenza</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #dc3545; margin-top: 0;">🔔 Avviso Mancanza Presenza</h2>
        <p><strong>${dipendente.nome} ${dipendente.cognome}</strong>,</p>
        <p>Siamo spiacenti di informarla che non abbiamo registrato la sua presenza oggi.</p>
      </div>

      <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px;">
        <h3 style="margin-top: 0;">📊 Dettagli:</h3>
        <ul>
          <li><strong>Data:</strong> ${new Date().toLocaleDateString('it-IT')}</li>
          <li><strong>Ora controllo:</strong> ${oraAttuale}</li>
          <li><strong>Orario previsto:</strong> ${dipendente.orarioPrevisto}</li>
        </ul>
      </div>

      <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin-top: 20px;">
        <p style="margin: 0;"><strong>⚠️ Importante:</strong> La preghiamo di registrare la sua presenza il prima possibile per evitare ulteriori avvisi.</p>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
        <p>Questo è un messaggio automatico del sistema di gestione presenze.</p>
        <p>Per assistenza, contattare l'amministratore.</p>
      </div>
    </body>
    </html>
    `

    const corpoTesto = `
🔔 AVVISO MANCANZA PRESENZA

${dipendente.nome} ${dipendente.cognome},

Siamo spiacenti di informarla che non abbiamo registrato la sua presenza oggi.

📊 DETTAGLI:
- Data: ${new Date().toLocaleDateString('it-IT')}
- Ora controllo: ${oraAttuale}
- Orario previsto: ${dipendente.orarioPrevisto}

⚠️ IMPORTANTE: La preghiamo di registrare la sua presenza il prima possibile.

Questo è un messaggio automatico del sistema di gestione presenze.
    `

    // Invio email via Resend
    const rispostaEmail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${amministratore.resend_api_key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `${amministratore.sender_name} <${amministratore.sender_email}>`,
        to: [dipendente.email],
        subject: oggetto,
        html: corpoHTML,
        text: corpoTesto
      })
    })

    if (!rispostaEmail.ok) {
      const erroreRisposta = await rispostaEmail.text()
      console.error(`❌ Errore API Resend: ${rispostaEmail.status} - ${erroreRisposta}`)
      return false
    }

    const risultato = await rispostaEmail.json()
    console.log(`✅ Email inviata con successo - ID: ${risultato.id}`)
    return true

  } catch (errore) {
    console.error("💥 Errore invio email:", errore)
    return false
  }
}
