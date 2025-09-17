// =========================================
// 📧 NUOVA EDGE FUNCTION INVIO EMAIL PRESENZE
// =========================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("📧 Edge Function Invio Email Presenze avviata")

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
    console.log("📅 Avvio processamento invio email presenze...")

    // Connessione a Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Data odierna
    const dataOdierna = new Date().toISOString().split('T')[0]
    console.log(`📆 Processamento avvisi per data: ${dataOdierna}`)

    // =================================================================
    // 1. RECUPERA AVVISI PENDENTI (non ancora inviati)
    // =================================================================
    console.log("🔍 Ricerca avvisi email da inviare...")
    const { data: avvisiDaInviare, error: erroreAvvisi } = await supabase
      .from("attendance_alerts")
      .select(`
        id,
        employee_id,
        admin_id,
        alert_date,
        alert_time,
        expected_time,
        created_at,
        profiles!attendance_alerts_employee_id_fkey (
          first_name,
          last_name,
          email
        ),
        admin_settings!attendance_alerts_admin_id_fkey (
          attendance_alert_enabled,
          attendance_alert_delay_minutes,
          resend_api_key,
          sender_name,
          sender_email
        )
      `)
      .eq("alert_date", dataOdierna)
      .is("email_sent_at", null) // Solo avvisi NON ancora inviati
      .order("created_at", { ascending: true }) // Prima i più vecchi

    if (erroreAvvisi) {
      console.error("❌ Errore recupero avvisi database:", erroreAvvisi)
      throw erroreAvvisi
    }

    const numeroAvvisi = avvisiDaInviare?.length || 0
    console.log(`📊 Trovati ${numeroAvvisi} avvisi da elaborare`)

    // Se non ci sono avvisi da inviare, termina
    if (!avvisiDaInviare || numeroAvvisi === 0) {
      console.log("✅ Nessun avviso email da inviare oggi")
      return new Response(JSON.stringify({
        messaggio: "Nessun avviso email da inviare",
        dataProcessamento: new Date().toISOString(),
        avvisiProcessati: 0,
        emailInviate: 0,
        errori: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    console.log(`📤 Inizio invio di ${numeroAvvisi} email di avviso...`)

    // =================================================================
    // 2. ELABORA OGNI AVVISO ED INVIA EMAIL
    // =================================================================
    const risultati = []
    const oraAttuale = new Date().toTimeString().slice(0, 5) // HH:MM
    let emailInviate = 0
    let erroriInvio = 0

    for (const avviso of avvisiDaInviare) {
      try {
        const nomeDipendente = avviso.profiles ?
          `${avviso.profiles.first_name} ${avviso.profiles.last_name}`.trim() :
          `ID: ${avviso.employee_id}`

        console.log(`👤 Elaborazione avviso per: ${nomeDipendente}`)

        // =================================================================
        // VERIFICHE PRE-INVIO
        // =================================================================

        // Verifica 1: Dipendente esiste
        if (!avviso.profiles) {
          console.log(`❌ SALTATO: Profilo dipendente non trovato per ${nomeDipendente}`)
          risultati.push({
            id_avviso: avviso.id,
            dipendente: nomeDipendente,
            stato: "saltato",
            motivo: "Profilo dipendente non trovato"
          })
          continue
        }

        // Verifica 2: Impostazioni amministratore esistono
        if (!avviso.admin_settings) {
          console.log(`❌ SALTATO: Impostazioni amministratore non trovate per ${nomeDipendente}`)
          risultati.push({
            id_avviso: avviso.id,
            dipendente: nomeDipendente,
            stato: "saltato",
            motivo: "Impostazioni amministratore non trovate"
          })
          continue
        }

        // Verifica 3: Amministratore abilitato
        if (!avviso.admin_settings.attendance_alert_enabled) {
          console.log(`❌ SALTATO: Amministratore non abilitato per ${nomeDipendente}`)
          risultati.push({
            id_avviso: avviso.id,
            dipendente: nomeDipendente,
            stato: "saltato",
            motivo: "Amministratore non abilitato alle notifiche"
          })
          continue
        }

        // Verifica 4: API key presente
        if (!avviso.admin_settings.resend_api_key) {
          console.log(`❌ SALTATO: API key Resend mancante per ${nomeDipendente}`)
          risultati.push({
            id_avviso: avviso.id,
            dipendente: nomeDipendente,
            stato: "saltato",
            motivo: "API key Resend non configurata"
          })
          continue
        }

        console.log(`✅ Tutte le verifiche superate per ${nomeDipendente}`)

        // =================================================================
        // PREPARAZIONE DATI EMAIL
        // =================================================================
        const datiDipendente = {
          id: avviso.employee_id,
          nome: avviso.profiles.first_name,
          cognome: avviso.profiles.last_name,
          email: avviso.profiles.email,
          orarioPrevisto: avviso.expected_time
        }

        const datiAmministratore = {
          ...avviso.admin_settings,
          nome: avviso.profiles.first_name, // Nota: qui usiamo i dati del dipendente come admin se necessario
          cognome: avviso.profiles.last_name
        }

        // =================================================================
        // INVIO EMAIL
        // =================================================================
        console.log(`📧 Invio email di avviso a ${datiDipendente.email}...`)
        const invioRiuscito = await inviaEmailAvvisoPresenze(supabase, datiAmministratore, datiDipendente, oraAttuale)

        if (invioRiuscito) {
          console.log(`✅ Email inviata con successo a ${nomeDipendente}`)

          // =================================================================
          // AGGIORNA DATABASE: MARCA COME INVIATA
          // =================================================================
          const { error: erroreAggiornamento } = await supabase
            .from("attendance_alerts")
            .update({
              email_sent_at: new Date().toISOString()
            })
            .eq("id", avviso.id)

          if (erroreAggiornamento) {
            console.error(`❌ ERRORE DATABASE: Invio riuscito ma errore aggiornamento per ${nomeDipendente}`)
            risultati.push({
              id_avviso: avviso.id,
              dipendente: nomeDipendente,
              stato: "inviato_ma_errore_db",
              errore: `Email inviata ma errore database: ${erroreAggiornamento.message}`
            })
          } else {
            console.log(`✅ AVVISO COMPLETATO: Email inviata e database aggiornato per ${nomeDipendente}`)
            emailInviate++
            risultati.push({
              id_avviso: avviso.id,
              dipendente: nomeDipendente,
              stato: "inviato_successo",
              messaggio: "Email inviata e database aggiornato"
            })
          }
        } else {
          console.error(`❌ FALLIMENTO INVIO: Email NON inviata a ${nomeDipendente}`)
          erroriInvio++
          risultati.push({
            id_avviso: avviso.id,
            dipendente: nomeDipendente,
            stato: "errore_invio_email",
            errore: "Fallimento invio email tramite Resend API"
          })
        }

      } catch (errore) {
        const nomeDipendente = avviso.profiles ?
          `${avviso.profiles.first_name} ${avviso.profiles.last_name}`.trim() :
          `ID: ${avviso.employee_id}`

        console.error(`💥 ERRORE SISTEMA durante processamento ${nomeDipendente}:`, errore)
        risultati.push({
          id_avviso: avviso.id,
          dipendente: nomeDipendente,
          stato: "errore_sistema",
          errore: `Errore sistema: ${errore.message}`
        })
      }
    }

    // =================================================================
    // 3. RISPOSTA FINALE
    // =================================================================
    console.log(`🎯 PROCESSAMENTO COMPLETATO:`)
    console.log(`   📧 Email inviate: ${emailInviate}`)
    console.log(`   ❌ Errori invio: ${erroriInvio}`)
    console.log(`   📊 Totale elaborati: ${numeroAvvisi}`)

    return new Response(JSON.stringify({
      successo: erroriInvio === 0,
      messaggio: `Elaborati ${numeroAvvisi} avvisi`,
      dataProcessamento: new Date().toISOString(),
      riepilogo: {
        avvisiTotali: numeroAvvisi,
        emailInviate: emailInviate,
        erroriInvio: erroriInvio,
        avvisiSaltati: numeroAvvisi - emailInviate - erroriInvio
      },
      risultati
    }), {
      status: erroriInvio === 0 ? 200 : 207, // 207 = Partial Content se ci sono errori
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })

  } catch (errore) {
    console.error("💥 Errore generale Edge Function:", errore)
    return new Response(JSON.stringify({
      successo: false,
      errore: errore.message,
      dataProcessamento: new Date().toISOString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }
})

// =========================================
// 📧 FUNZIONE INVIO EMAIL AVVISO PRESENZE
// =========================================
async function inviaEmailAvvisoPresenze(supabase: any, amministratore: any, dipendente: any, oraAttuale: string) {
  try {
    console.log(`📤 Preparazione email per ${dipendente.email}...`)

    // Validazione dati essenziali
    if (!amministratore.resend_api_key) {
      console.error(`❌ ERRORE CONFIGURAZIONE: API key Resend mancante`)
      return false
    }

    if (!amministratore.sender_email) {
      console.error(`❌ ERRORE CONFIGURAZIONE: Email mittente mancante`)
      return false
    }

    if (!dipendente.email) {
      console.error(`❌ ERRORE DATI: Email destinatario mancante per ${dipendente.nome}`)
      return false
    }

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

    console.log(`📨 Invio email da ${amministratore.sender_name} <${amministratore.sender_email}> a ${dipendente.email}...`)

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

    console.log(`📡 Risposta API Resend - Status: ${rispostaEmail.status}`)

    if (!rispostaEmail.ok) {
      const erroreRisposta = await rispostaEmail.text()
      console.error(`❌ ERRORE API RESEND - Status: ${rispostaEmail.status}`)
      console.error(`❌ Dettagli errore: ${erroreRisposta}`)

      // Analizza il tipo di errore
      if (rispostaEmail.status === 401) {
        console.error(`❌ AUTENTICAZIONE FALLITA: API key non valida`)
      } else if (rispostaEmail.status === 403) {
        console.error(`❌ AUTORIZZAZIONE FALLITA: Dominio non verificato o rate limit`)
      } else if (rispostaEmail.status === 422) {
        console.error(`❌ DATI NON VALIDI: Controlla formato email`)
      } else {
        console.error(`❌ ERRORE GENERICO API: ${rispostaEmail.status} - ${erroreRisposta}`)
      }

      return false
    }

    const risultato = await rispostaEmail.json()
    console.log(`✅ EMAIL INVIATA CON SUCCESSO - ID Resend: ${risultato.id}`)
    console.log(`✅ Destinatario: ${dipendente.nome} ${dipendente.cognome} (${dipendente.email})`)
    return true

  } catch (errore) {
    console.error(`💥 ERRORE SISTEMA durante invio email a ${dipendente.nome} ${dipendente.cognome}:`, errore)

    // Analizza il tipo di errore di sistema
    if (errore.message.includes('fetch')) {
      console.error(`❌ ERRORE RETE: Impossibile raggiungere API Resend`)
    } else if (errore.message.includes('JSON')) {
      console.error(`❌ ERRORE DATI: Problema nella preparazione della richiesta`)
    } else {
      console.error(`❌ ERRORE SCONOSCIUTO: ${errore.message}`)
    }

    return false
  }
}
