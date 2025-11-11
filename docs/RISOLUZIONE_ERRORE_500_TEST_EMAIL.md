# ✅ Risoluzione Errore 500 Test Email

## 🎯 Situazione Attuale

### ✅ Cosa È Stato Fatto

1. **Codice Edge Function aggiornato** ✅
   - Convertito da Brevo a Resend
   - File: `supabase/functions/send-test-email/index.ts`
   - ✅ Usa `resend_api_key` invece di `brevo_api_key`
   - ✅ Usa API Resend (`https://api.resend.com/emails`)
   - ✅ Gestione errori migliorata

2. **Configurazione Database** ✅
   - Resend API Key: **CONFIGURATA** ✅
   - Sender Email: `servizio@alminfissi.it` ✅
   - Sender Name: `A.L.M Infissi` ✅
   - Reply To: `servizio@alminfissi.it` ✅

3. **Frontend aggiornato** ✅
   - TestEmailDialog pronto
   - Pulsanti "Invia Test" attivi su tutti i template

### ❌ Problema Rimanente

**La Edge Function NON è stata deployata su Supabase Cloud.**

Il codice nel tuo progetto locale è aggiornato, ma Supabase sta ancora eseguendo la vecchia versione (con Brevo). Ecco perché ricevi l'errore 500.

---

## 🚀 Soluzione: Deploy della Edge Function

Hai **3 opzioni** per deployare:

### Opzione 1: Deploy con Supabase CLI (Raccomandato)

```bash
# 1. Installa Supabase CLI (se non l'hai già)
brew install supabase/tap/supabase

# 2. Login a Supabase
supabase login

# 3. Collega il progetto
supabase link --project-ref nohufgceuqhkycsdffqj

# 4. Deploy della funzione
supabase functions deploy send-test-email

# 5. Verifica
supabase functions list
```

### Opzione 2: Deploy da Dashboard Supabase

1. Vai su https://supabase.com/dashboard
2. Seleziona il progetto
3. Vai su **Edge Functions** → `send-test-email`
4. Clicca **"Edit"** o **"Code"**
5. Copia tutto il contenuto da `supabase/functions/send-test-email/index.ts`
6. Incolla nell'editor
7. Clicca **"Deploy"**

### Opzione 3: Deploy con npm script

Se hai configurato uno script di deploy nel `package.json`:

```bash
npm run deploy:functions
```

---

## 🧪 Verifica Dopo il Deploy

### Test 1: Controlla i log

```bash
# Da terminale (se hai CLI)
supabase functions logs send-test-email --follow

# Oppure dalla Dashboard
# Edge Functions → send-test-email → Logs
```

### Test 2: Prova dall'applicazione

1. Vai su **Gestione Modelli Email**
2. Scegli un template (es: Template Sistema → Promemoria Presenza)
3. Clicca **"Invia Test"**
4. Inserisci la tua email
5. Clicca **"Invia Test"**

Dovresti vedere nei log:

```
[Test Email] Starting test email function
[Test Email] Found Resend settings for admin
[Test Email] Calling Resend API
[Test Email] Test email sent successfully!
```

### Test 3: Verifica l'email

Controlla la tua casella di posta:
- **Oggetto**: `[TEST] Nome del template`
- **Da**: `A.L.M Infissi <servizio@alminfissi.it>`
- **Contenuto**: Dati di esempio (Mario Rossi, date fittizie)
- **Stili**: Colori personalizzati applicati

---

## 📋 Checklist Completa

Prima che tutto funzioni:

- [x] Codice Edge Function aggiornato a Resend
- [x] Resend API Key configurata nel database
- [x] Sender Email configurata (`servizio@alminfissi.it`)
- [x] Sender Name configurato (`A.L.M Infissi`)
- [ ] **Edge Function deployata** ← DA FARE
- [ ] Dominio verificato in Resend ← DA VERIFICARE
- [ ] Test email inviata con successo

---

## 🔍 Verifica Dominio Resend

Importante: Il dominio `alminfissi.it` deve essere **verificato** in Resend.

### Controlla su Resend

1. Vai su https://resend.com/domains
2. Cerca `alminfissi.it`
3. Verifica che sia **verificato** (✅ verde)

### Se NON è verificato

**Opzione A**: Verifica il dominio
1. Segui le istruzioni di Resend
2. Aggiungi i record DNS richiesti
3. Aspetta la verifica (5-30 minuti)

**Opzione B**: Usa email di test Resend (per ora)
1. Vai su Impostazioni → Configurazione Email
2. Cambia `sender_email` in: `onboarding@resend.dev`
3. Salva
4. Prova di nuovo il test email

---

## 🐛 Troubleshooting

### "supabase: command not found"

```bash
# Installa Supabase CLI
brew install supabase/tap/supabase
```

### "project not linked"

```bash
supabase link --project-ref nohufgceuqhkycsdffqj
```

### "Failed to deploy: unauthorized"

Verifica di essere **Owner** o **Admin** del progetto Supabase.

### "Email not sent" dopo il deploy

1. Controlla i log: `supabase functions logs send-test-email --follow`
2. Verifica che il dominio sia verificato in Resend
3. Oppure usa `onboarding@resend.dev` come sender_email

---

## 📊 Cosa Cambierà Dopo il Deploy

### Prima (errore 500)

```
❌ POST .../send-test-email → 500 Internal Server Error
❌ Usa ancora Brevo (non configurato)
❌ Cerca brevo_api_key (non esiste)
```

### Dopo il deploy

```
✅ POST .../send-test-email → 200 OK
✅ Usa Resend (configurato)
✅ Trova resend_api_key (presente)
✅ Email inviata con successo
```

---

## 🎯 Quick Start (TL;DR)

```bash
# Deploy con CLI (più veloce)
supabase login
supabase link --project-ref nohufgceuqhkycsdffqj
supabase functions deploy send-test-email

# Test dall'app
# Gestione Modelli Email → Invia Test
```

Oppure

```
1. Vai su dashboard.supabase.com
2. Edge Functions → send-test-email → Edit
3. Copia/Incolla nuovo codice
4. Deploy
5. Test dall'app
```

---

## 💡 Riepilogo

**Problema**: Errore 500 quando invii test email

**Causa**: Edge Function non deployata (usa ancora codice vecchio con Brevo)

**Soluzione**: Deploy della Edge Function con uno dei 3 metodi sopra

**Risultato atteso**: Email di test inviate con successo via Resend

---

Dopo il deploy, la funzione di test email funzionerà perfettamente! 🚀
