# 🔧 Troubleshooting Test Email - Errore 500

## Problema

Quando si clicca "Invia Test" su un template email, si riceve questo errore:

```
POST https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/send-test-email 500 (Internal Server Error)
```

---

## 🔍 Passi per il Debug

### 1. Controlla i Log della Console Browser

Apri DevTools (F12) e guarda la console. Dovresti vedere log dettagliati tipo:

```javascript
=== SENDING TEST EMAIL ===
Request params: {
  "testEmail": "test@example.com",
  "subject": "Test",
  "content": "Test content",
  "userId": "xxx-xxx-xxx",
  "templateType": "avviso-entrata",
  "templateCategory": "amministratori"
}
```

**Verifica:**
- `userId` è presente e valido?
- `templateCategory` è presente (non undefined)?
- `subject` e `content` sono presenti?

---

### 2. Controlla i Log della Edge Function

**Metodo A: Dashboard Supabase**
1. Vai su https://supabase.com/dashboard
2. Seleziona il progetto
3. Vai a "Edge Functions" → "send-test-email"
4. Clicca su "Logs"
5. Filtra per timestamp recente
6. Cerca messaggi tipo:
   ```
   [Test Email] Starting test email function
   [Test Email] Request body: {...}
   [Test Email] Looking for admin settings...
   ```

**Metodo B: CLI (se disponibile)**
```bash
supabase functions logs send-test-email --project-ref nohufgceuqhkycsdffqj
```

---

### 3. Verifica Configurazione Resend

L'errore più comune è la mancanza della **Resend API Key**.

**Controlla:**
1. Vai su: Impostazioni → Configurazione Email
2. Verifica che ci sia una API Key di Resend
3. Verifica che l'email mittente sia configurata e verificata

**Se manca:**
```sql
-- Controlla nella tabella admin_settings
SELECT admin_id, resend_api_key, sender_email, sender_name
FROM admin_settings
WHERE admin_id = 'IL_TUO_USER_ID';
```

---

### 4. Verifica Template nel Database

Il template potrebbe non esistere nel database.

**Controlla:**
```sql
-- Vedi tutti i template
SELECT id, template_type, template_category, name,
       LENGTH(content) as content_length
FROM email_templates
WHERE admin_id = 'IL_TUO_USER_ID';
```

**Se non ci sono template:**
- È normale! La funzione creerà un template HTML di default
- Ma verifica che `template_type` e `template_category` siano corretti

---

### 5. Possibili Cause Specifiche

#### A. Errore "Missing userId"
**Causa**: Profile non caricato correttamente
**Soluzione**: Ricarica la pagina, assicurati di essere loggato

#### B. Errore "No Resend API key configured"
**Causa**: Resend non configurato
**Soluzione**:
1. Vai su https://resend.com
2. Crea account se non ce l'hai
3. Vai su "API Keys"
4. Crea una nuova API Key
5. Copiala in Impostazioni → Configurazione Email

#### C. Errore "Failed to send test email via Resend"
**Causa**: Email mittente non verificata o dominio non configurato
**Soluzione**:
1. Vai su https://resend.com
2. Vai su "Domains"
3. Aggiungi e verifica il tuo dominio
4. Oppure usa l'email onboarding@resend.dev per i test

#### D. Errore "Failed to build email content"
**Causa**: Errore nel template HTML
**Soluzione**: Ora c'è un fallback, ma controlla:
- Che `subject` non contenga caratteri strani
- Che `content` non sia troppo lungo
- Che non ci siano caratteri speciali non escaped

---

### 6. Test Manuale con curl

Prova a chiamare direttamente la Edge Function:

```bash
curl -X POST \
  'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/send-test-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "testEmail": "test@example.com",
    "subject": "Test Subject",
    "content": "Test content",
    "userId": "YOUR_USER_ID",
    "templateType": "documenti",
    "templateCategory": "amministratori"
  }'
```

---

### 7. Miglioramenti Implementati

Ho appena implementato:

✅ **Template HTML di default**: Se il template non esiste nel DB, viene creato un HTML pulito
✅ **Logging esteso**: Più console.log per tracciare ogni passaggio
✅ **Error handling migliore**: Catch specifici per ogni tipo di errore
✅ **Messaggi di errore dettagliati**: L'utente vede esattamente cosa è andato storto

---

## 🐛 Errori Comuni e Soluzioni

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| 500 Internal Server Error | Vari | Controlla log Edge Function |
| "No Resend API key" | API Key mancante | Configura in Impostazioni |
| "relation does not exist" | Database non sincronizzato | Riapplica migrations |
| "Email not sent" | Email mittente non verificata | Verifica dominio in Resend |
| "Invalid email" | Formato email errato | Usa email valida |

---

## 🚀 Quick Fix

**Se niente funziona, prova:**

1. **Logout e Login** - Ricarica sessione
2. **Svuota cache browser** - Ctrl+Shift+Del
3. **Ricarica pagina** - F5
4. **Controlla Resend configurato** - Impostazioni Admin
5. **Prova email diversa** - Usa gmail/outlook
6. **Controlla spam** - Email potrebbe finire lì

---

## 📞 Quando Contattare Supporto

Se dopo tutti questi passi l'errore persiste, raccogli:

1. **Screenshot dell'errore** nella console
2. **Log della Edge Function** (ultimi 10 minuti)
3. **User ID** dell'admin
4. **Template type** e **category** che stavi testando
5. **Timestamp esatto** dell'errore

---

## 💡 Prevenzione

Per evitare questi problemi in futuro:

1. ✅ Configura Resend subito dopo il setup
2. ✅ Verifica il dominio in Resend (o usa onboarding@resend.dev per test)
3. ✅ Testa con la tua email prima
4. ✅ Salva il template prima di testare
5. ✅ Controlla i log periodicamente

---

## 🔄 Prossimi Passi

1. **Prova ora** a inviare un test email
2. **Controlla console** per nuovi log dettagliati
3. **Se fallisce ancora**, guarda i log Edge Function
4. **Identifica** quale step specifico sta fallendo
5. **Applica** la soluzione corrispondente

---

Con i nuovi miglioramenti, dovresti vedere messaggi di errore molto più dettagliati che ti dicono esattamente cosa non va! 🎯
