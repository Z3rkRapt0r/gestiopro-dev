# 🚀 Deployare Edge Function send-test-email

## Problema

Hai modificato il codice della Edge Function `send-test-email` da Brevo a Resend, ma la funzione su Supabase sta ancora usando la vecchia versione. Devi fare il deploy della nuova versione.

---

## 📋 Prerequisiti

1. ✅ Supabase CLI installato
2. ✅ Account Supabase con accesso al progetto
3. ✅ Progetto ID: `nohufgceuqhkycsdffqj`

---

## 🔧 Metodo 1: Deploy con Supabase CLI (Raccomandato)

### Step 1: Installa Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Oppure con npm
npm install -g supabase
```

### Step 2: Login a Supabase

```bash
supabase login
```

Ti aprirà il browser per fare login al tuo account Supabase.

### Step 3: Link al tuo progetto

```bash
# Nella directory del progetto
cd /Users/gabrielebellante/finestra-gestione-aziendale-pro

# Collega il progetto
supabase link --project-ref nohufgceuqhkycsdffqj
```

Ti chiederà la password del database. Usala per completare il link.

### Step 4: Deploy della singola funzione

```bash
# Deploy solo della funzione send-test-email
supabase functions deploy send-test-email
```

Aspetta che il deploy completi. Vedrai un messaggio tipo:
```
Deploying function send-test-email...
Function send-test-email deployed successfully!
URL: https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/send-test-email
```

### Step 5: Verifica il deploy

```bash
# Controlla lo stato della funzione
supabase functions list
```

Dovresti vedere `send-test-email` nella lista con status "Active".

---

## 🔧 Metodo 2: Deploy da Dashboard Supabase

Se non riesci a usare la CLI, puoi fare il deploy manualmente:

### Step 1: Vai alla Dashboard

1. Apri https://supabase.com/dashboard
2. Seleziona il progetto `nohufgceuqhkycsdffqj`
3. Vai su **Edge Functions** nel menu laterale

### Step 2: Trova la funzione

1. Cerca `send-test-email` nella lista
2. Clicca sul nome della funzione

### Step 3: Modifica il codice

1. Clicca su **"Edit Function"** o **"Code"**
2. Copia tutto il contenuto da:
   ```
   /Users/gabrielebellante/finestra-gestione-aziendale-pro/supabase/functions/send-test-email/index.ts
   ```
3. Incollalo nell'editor della dashboard
4. Clicca **"Deploy"** o **"Save"**

---

## 🔧 Metodo 3: Deploy di tutte le funzioni

Se vuoi deployare tutte le Edge Functions in una volta:

```bash
# Deploy di tutte le funzioni
supabase functions deploy
```

⚠️ **Attenzione**: Questo deployerà TUTTE le funzioni nella cartella `supabase/functions/`. Usa solo se sei sicuro che tutte le funzioni siano pronte.

---

## 🧪 Test dopo il Deploy

### Test 1: Controlla i log

```bash
# Guarda i log in tempo reale
supabase functions logs send-test-email --follow
```

Oppure dalla dashboard: Edge Functions → send-test-email → Logs

### Test 2: Test manuale con curl

```bash
# Sostituisci YOUR_ANON_KEY con la tua chiave pubblica
curl -X POST \
  'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/send-test-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "testEmail": "tuaemail@example.com",
    "subject": "Test Subject",
    "content": "Test content",
    "userId": "YOUR_USER_ID",
    "templateType": "avviso-entrata",
    "templateCategory": "amministratori"
  }'
```

Per trovare YOUR_ANON_KEY:
1. Dashboard Supabase → Settings → API
2. Copia "Project API keys" → "anon" / "public"

### Test 3: Test dall'applicazione

1. Vai su **Gestione Modelli Email**
2. Scegli un template
3. Clicca **"Invia Test"**
4. Inserisci la tua email
5. Clicca **"Invia Test"**

Controlla i log in tempo reale mentre testi:
```bash
supabase functions logs send-test-email --follow
```

---

## 🔍 Troubleshooting Deploy

### Errore: "supabase: command not found"

**Soluzione**: Installa Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm
npm install -g supabase
```

### Errore: "project not linked"

**Soluzione**: Collega il progetto

```bash
supabase link --project-ref nohufgceuqhkycsdffqj
```

### Errore: "invalid access token"

**Soluzione**: Fai login di nuovo

```bash
supabase logout
supabase login
```

### Errore: "function deploy failed"

**Cause possibili**:
1. Errore di sintassi nel codice TypeScript
2. Import mancanti
3. Permessi insufficienti

**Soluzione**: Controlla i log:
```bash
supabase functions logs send-test-email
```

### Errore: "Failed to deploy function: unauthorized"

**Soluzione**: Verifica di essere owner o admin del progetto Supabase.

---

## 📊 Verifica configurazione Resend

Prima di testare l'invio, assicurati che Resend sia configurato:

```bash
# Verifica la configurazione nel database
node scripts/verify-resend-config.js
```

Questo script controlla:
- ✅ Resend API Key presente
- ✅ Sender Email configurata
- ✅ Sender Name configurato

Se qualcosa manca, vai su **Impostazioni → Configurazione Email** nell'app.

---

## 🎯 Checklist completa

Prima di testare l'invio email, verifica:

- [ ] Edge Function deployata (metodo 1, 2 o 3)
- [ ] Resend API Key configurata nel database
- [ ] Sender Email configurata
- [ ] Sender Name configurato
- [ ] Dominio verificato in Resend (o usa onboarding@resend.dev)
- [ ] Test con curl funziona
- [ ] Log della funzione non mostrano errori

---

## 📚 Link Utili

- **Supabase CLI Docs**: https://supabase.com/docs/reference/cli/introduction
- **Edge Functions Docs**: https://supabase.com/docs/guides/functions
- **Resend Docs**: https://resend.com/docs/introduction
- **Resend Dashboard**: https://resend.com/emails

---

## 💡 Quick Start (TL;DR)

```bash
# 1. Installa CLI
brew install supabase/tap/supabase

# 2. Login
supabase login

# 3. Link progetto
supabase link --project-ref nohufgceuqhkycsdffqj

# 4. Deploy funzione
supabase functions deploy send-test-email

# 5. Verifica config
node scripts/verify-resend-config.js

# 6. Test dall'app
# Gestione Modelli Email → Invia Test
```

---

## 🆘 Se niente funziona

1. **Controlla i log** della funzione:
   ```bash
   supabase functions logs send-test-email --follow
   ```

2. **Controlla lo stato del deploy**:
   ```bash
   supabase functions list
   ```

3. **Ri-deploya forzando**:
   ```bash
   supabase functions deploy send-test-email --no-verify-jwt
   ```

4. **Verifica che il file sia corretto**:
   ```bash
   cat supabase/functions/send-test-email/index.ts | grep "resend"
   ```
   Dovresti vedere riferimenti a "resend" e NON a "brevo".

---

Dopo aver fatto il deploy, la funzione di test email dovrebbe funzionare! 🎉
