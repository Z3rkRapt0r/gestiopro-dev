# 🔔 Sistema di Monitoraggio Presenze - Setup Completo

## 🎯 Obiettivo

Sistema automatico che controlla le presenze mancanti e invia email di avviso agli admin, **senza hardcode di URL o chiavi** nel database.

---

## 🏗️ Architettura

```
┌─────────────────┐
│  Vercel Cron    │  ← Scheduler (ogni 15 min, 8-18, lun-ven)
└────────┬────────┘
         │
         ↓ chiama
┌─────────────────┐
│  /api/cron/     │  ← API endpoint (usa env correnti)
│  check-attendance│
└────────┬────────┘
         │
         ↓ chiama
┌─────────────────┐
│  Edge Function  │  ← check-missing-attendance
│  (Supabase)     │     (usa SUPABASE_URL/KEY da env)
└────────┬────────┘
         │
         ↓ legge/scrive
┌─────────────────┐
│  Database       │  ← Tabelle: attendance_check_triggers,
│  (Postgres)     │     admin_settings, attendance_alerts
└─────────────────┘
```

### ✅ Vantaggi

- **Zero hardcode**: URL e chiavi vengono dalle variabili d'ambiente
- **Portabile**: clona il progetto, imposta gli env, funziona
- **Sicuro**: service role key non finisce nel database
- **Manutenibile**: logica tutta in TypeScript/Edge Functions

---

## 📦 Componenti

### 1. **Database** (Postgres)
- `attendance_check_triggers`: segna quando serve un controllo
- `admin_settings`: configurazione admin (alert abilitati, delay, API keys)
- `attendance_alerts`: log degli avvisi inviati

### 2. **Edge Function** (Supabase)
- `supabase/functions/check-missing-attendance/index.ts`
- Legge trigger pending
- Controlla presenze mancanti
- Invia email via Resend
- Aggiorna database

### 3. **Cron Endpoint** (Vercel)
- `api/cron/check-attendance.ts`
- Chiamato automaticamente da Vercel Cron
- Chiama l'Edge Function

### 4. **Scheduler** (Vercel Cron)
- Configurato in `vercel.json`
- Esegue ogni 15 minuti, 8-18, lun-ven

---

## 🚀 Setup Iniziale (Prima Volta)

### 1. Configurare le Variabili d'Ambiente

Crea/aggiorna `.env` (o Vercel Environment Variables):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tuo-progetto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ← IMPORTANTE!

# Vercel Cron (opzionale, per sicurezza)
CRON_SECRET=un-segreto-casuale-lungo
```

### 2. Applicare lo Script SQL

Esegui lo script che crea il trigger database (senza hardcode):

```bash
npx supabase db execute --file sql/cron/attendance_monitor_no_hardcode.sql
```

Questo crea:
- La funzione `trigger_attendance_check()` (senza chiamate HTTP)
- Il cron job Postgres che crea trigger "pending" ogni 15 minuti

### 3. Deploy su Vercel

```bash
git add .
git commit -m "Setup attendance monitoring without hardcode"
git push
```

Vercel rileverà automaticamente il `vercel.json` con la configurazione `crons` e attiverà lo scheduler.

### 4. Verificare il Deploy

1. Vai su **Vercel Dashboard → Settings → Cron Jobs**
2. Dovresti vedere: `/api/cron/check-attendance` con schedule `*/15 8-18 * * 1-5`
3. Puoi testare manualmente cliccando "Run"

---

## 🔄 Setup Dopo un Clone

Quando cloni il progetto su un nuovo ambiente:

### 1. Imposta le Variabili d'Ambiente

```bash
# Nel nuovo progetto Vercel/Supabase
NEXT_PUBLIC_SUPABASE_URL=https://nuovo-progetto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=nuova-chiave-service-role
```

### 2. Esegui lo Script SQL

```bash
npx supabase db execute --file sql/cron/attendance_monitor_no_hardcode.sql
```

### 3. Deploy

```bash
git push
```

**FATTO!** Non devi modificare nessun file SQL o hardcodare URL. Tutto viene dalle env.

---

## 🧪 Testing

### Test Manuale dell'Edge Function

```bash
curl -X POST \
  https://tuo-progetto.supabase.co/functions/v1/check-missing-attendance \
  -H "Authorization: Bearer TUA-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json"
```

### Test del Cron Endpoint

```bash
curl -X GET \
  https://tuo-app.vercel.app/api/cron/check-attendance \
  -H "Authorization: Bearer TUO-CRON-SECRET"
```

### Verifica Database

```sql
-- Vedi i trigger creati
SELECT * FROM attendance_check_triggers ORDER BY trigger_date DESC LIMIT 10;

-- Vedi gli avvisi inviati
SELECT * FROM attendance_alerts ORDER BY alert_date DESC LIMIT 10;

-- Vedi la configurazione admin
SELECT admin_id, attendance_alert_enabled, attendance_alert_delay_minutes 
FROM admin_settings 
WHERE attendance_alert_enabled = true;
```

---

## ⚙️ Configurazione Admin

Gli admin possono configurare il sistema da:
**Dashboard → Impostazioni → Presenze → Avvisi Presenze**

Opzioni:
- ✅ Abilita avvisi mancato check-in
- ⏱️ Ritardo in minuti (default: 30)
- 📧 Configurazione email (sender, Resend API key)

---

## 🔧 Troubleshooting

### Gli avvisi non arrivano

1. **Verifica che il cron sia attivo**:
   - Vercel Dashboard → Cron Jobs → controlla lo stato

2. **Verifica le variabili d'ambiente**:
   ```bash
   # Devono essere impostate su Vercel
   NEXT_PUBLIC_SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Controlla i log**:
   - Vercel Dashboard → Logs → filtra per `/api/cron/check-attendance`
   - Supabase Dashboard → Edge Functions → check-missing-attendance logs

4. **Verifica configurazione admin**:
   ```sql
   SELECT * FROM admin_settings WHERE attendance_alert_enabled = true;
   ```

### Il cron non parte

1. **Verifica vercel.json**:
   - Deve contenere la sezione `crons`
   - Schedule deve essere valido (formato cron)

2. **Redeploy**:
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push
   ```

3. **Controlla il piano Vercel**:
   - I Cron Jobs richiedono un piano Pro o superiore

---

## 📊 Monitoraggio

### Dashboard Vercel
- **Cron Jobs**: vedi esecuzioni, successi, errori
- **Logs**: dettagli di ogni esecuzione

### Dashboard Supabase
- **Edge Functions**: logs dell'Edge Function
- **Database**: query per vedere trigger e avvisi

### Query Utili

```sql
-- Statistiche avvisi ultimi 7 giorni
SELECT 
  alert_date,
  COUNT(*) as num_avvisi,
  COUNT(DISTINCT employee_id) as dipendenti_unici
FROM attendance_alerts
WHERE alert_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY alert_date
ORDER BY alert_date DESC;

-- Admin con avvisi abilitati
SELECT 
  p.first_name,
  p.last_name,
  p.email,
  a.attendance_alert_delay_minutes
FROM admin_settings a
JOIN profiles p ON a.admin_id = p.id
WHERE a.attendance_alert_enabled = true;
```

---

## 🔐 Sicurezza

### Best Practices

1. **Service Role Key**: 
   - Mai committare nel codice
   - Solo nelle variabili d'ambiente Vercel/Supabase
   - Ruota periodicamente

2. **Cron Secret**:
   - Usa un segreto casuale lungo
   - Impedisce chiamate non autorizzate al cron endpoint

3. **RLS Policies**:
   - Le tabelle hanno Row Level Security abilitato
   - Solo admin possono gestire configurazioni

---

## 📝 Changelog

### v2.0 (2025-01-08) - Zero Hardcode
- ✅ Rimosso hardcode di URL/chiavi dal database
- ✅ Spostata logica nelle Edge Functions
- ✅ Aggiunto Vercel Cron per scheduling
- ✅ Sistema completamente portabile

### v1.0 (2024) - Versione Originale
- ❌ URL e service key hardcoded in SQL
- ❌ Richiedeva modifica manuale dopo ogni clone

---

## 🎓 Come Funziona (Dettagli Tecnici)

### Flusso Completo

1. **Vercel Cron** (ogni 15 min, 8-18, lun-ven):
   ```
   Chiama → /api/cron/check-attendance
   ```

2. **API Endpoint**:
   ```typescript
   // Legge env del progetto corrente
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
   const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
   
   // Chiama Edge Function
   fetch(`${supabaseUrl}/functions/v1/check-missing-attendance`, {
     headers: { Authorization: `Bearer ${serviceKey}` }
   });
   ```

3. **Edge Function**:
   ```typescript
   // Crea client con env Supabase
   const supabase = createClient(
     Deno.env.get("SUPABASE_URL"),
     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
   );
   
   // Legge trigger pending
   // Controlla presenze mancanti
   // Invia email
   // Aggiorna database
   ```

4. **Database**:
   ```sql
   -- Trigger creato dal cron Postgres
   INSERT INTO attendance_check_triggers (status) VALUES ('pending');
   
   -- Edge Function lo legge e lo processa
   UPDATE attendance_check_triggers SET status = 'completed';
   ```

---

## 🆘 Supporto

Per problemi o domande:
1. Controlla i logs (Vercel + Supabase)
2. Verifica le variabili d'ambiente
3. Testa manualmente l'Edge Function
4. Consulta la sezione Troubleshooting

---

## ✅ Checklist Setup

- [ ] Variabili d'ambiente impostate su Vercel
- [ ] Script SQL eseguito (`attendance_monitor_no_hardcode.sql`)
- [ ] Deploy effettuato
- [ ] Cron Job visibile su Vercel Dashboard
- [ ] Test manuale Edge Function riuscito
- [ ] Configurazione admin completata (avvisi abilitati)
- [ ] Primo avviso ricevuto con successo

🎉 **Sistema pronto!** Ora puoi clonare il progetto senza preoccuparti di hardcode.


