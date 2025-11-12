# Setup Email Triggers - Guida Completa

## Problema Attuale
I trigger email per invio automatico (creazione dipendente, ferie, permessi) non funzionano perché manca la configurazione nella tabella `app_config`.

## Causa
I trigger del database hanno bisogno di:
1. **project_ref**: Per costruire URL Edge Functions
2. **service_role_key**: Per autenticare chiamate HTTP alle Edge Functions

Senza questi dati, i trigger non possono chiamare le Edge Functions.

---

## ✅ Soluzione: Configurare app_config

### Step 1: Ottieni le Credenziali Supabase

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il progetto: **nohufgceuqhkycsdffqj**
3. Vai in **Settings > API**
4. Copia:
   - **Project URL**: `https://nohufgceuqhkycsdffqj.supabase.co`
   - **Service Role Key** (secret): inizia con `eyJ...`

### Step 2: Configura Database

Esegui questo SQL nel tuo database (SQL Editor o via Prisma):

```sql
-- Inserisci o aggiorna configurazione
INSERT INTO app_config (id, project_ref, service_role_key)
VALUES (
    1,
    'nohufgceuqhkycsdffqj',
    'TUA_SERVICE_ROLE_KEY_QUI'  -- ⚠️ SOSTITUISCI con la tua key!
)
ON CONFLICT (id)
DO UPDATE SET
    project_ref = 'nohufgceuqhkycsdffqj',
    service_role_key = 'TUA_SERVICE_ROLE_KEY_QUI';
```

### Step 3: Verifica Configurazione

```sql
SELECT
    id,
    project_ref,
    CASE
        WHEN service_role_key IS NOT NULL THEN '✅ Configurata'
        ELSE '❌ Mancante'
    END as status
FROM app_config
WHERE id = 1;
```

Dovresti vedere `✅ Configurata`.

---

## 🧪 Test Funzionamento

### Test 1: Verifica Trigger Installati

```sql
SELECT
    trigger_name,
    event_object_table,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_notify%'
ORDER BY trigger_name;
```

Dovresti vedere:
- ✅ `trigger_notify_new_employee` su `profiles` (INSERT)
- ✅ `trigger_notify_leave_request` su `leave_requests` (INSERT)
- ✅ `trigger_notify_leave_status_change` su `leave_requests` (UPDATE)

### Test 2: Crea un Dipendente di Test

1. Vai nell'app Gestiopro come admin
2. Crea un nuovo dipendente con email valida
3. Controlla:
   - ✉️ Email benvenuto dovrebbe arrivare entro 1 minuto
   - 📊 Controlla log Supabase: Functions > send-welcome-email > Logs
   - 🔍 Se non arriva, cerca errori nei log

### Test 3: Verifica Log Database

```sql
-- I trigger usano RAISE NOTICE/WARNING
-- Verifica nei log PostgreSQL se i trigger si attivano
```

---

## 🔧 Troubleshooting

### Problema: Email non arriva

**Check 1: app_config configurata?**
```sql
SELECT * FROM app_config WHERE id = 1;
```
- `project_ref` deve essere `nohufgceuqhkycsdffqj`
- `service_role_key` NON deve essere NULL

**Check 2: Trigger attivi?**
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_notify_new_employee';
```
- Deve esistere e essere su tabella `profiles`

**Check 3: Edge Function deployata?**
```bash
npx supabase functions list
```
- `send-welcome-email` deve essere nella lista

**Check 4: Log Edge Function**
- Vai su Supabase Dashboard
- Functions > send-welcome-email > Logs
- Cerca errori o chiamate mancanti

### Problema: Trigger non si attiva

**Possibili cause:**
1. ❌ `app_config` vuota o NULL
2. ❌ Trigger non applicato al database
3. ❌ Role != 'employee' (trigger ignora admin)

**Fix:**
```bash
# Riapplica migration trigger
cat supabase/migrations/20250114110000_fix_email_triggers.sql | \
npx prisma db execute --stdin --schema prisma/schema.prisma
```

### Problema: Errore HTTP in trigger

**Sintomi:** Log database mostra "Errore invio email"

**Possibili cause:**
1. ❌ service_role_key errata
2. ❌ project_ref errato
3. ❌ Edge Function non deployata
4. ❌ Resend API key non configurata

**Fix:**
1. Verifica credenziali in `app_config`
2. Deploy Edge Function: `npx supabase functions deploy send-welcome-email`
3. Verifica Resend API key in `admin_settings`

---

## 📋 Checklist Completa

### Database Setup
- [ ] Tabella `app_config` esiste
- [ ] Record con `id=1` esiste
- [ ] `project_ref` = `nohufgceuqhkycsdffqj`
- [ ] `service_role_key` configurata (NOT NULL)

### Trigger Setup
- [ ] `trigger_notify_new_employee` installato
- [ ] `trigger_notify_leave_request` installato
- [ ] `trigger_notify_leave_status_change` installato

### Edge Functions
- [ ] `send-welcome-email` deployata
- [ ] `send-leave-request-email` deployata
- [ ] Resend API key configurata in `admin_settings`

### Email Templates
- [ ] Template "nuovo-dipendente" creato (opzionale, ha fallback)
- [ ] Template "ferie-richiesta" creato
- [ ] Template "ferie-approvazione" creato
- [ ] Template "ferie-rifiuto" creato

---

## 🚀 Quick Fix (TL;DR)

```bash
# 1. Configura app_config con la tua service_role_key
psql "postgresql://..." -c "
INSERT INTO app_config (id, project_ref, service_role_key)
VALUES (1, 'nohufgceuqhkycsdffqj', 'TUA_SERVICE_ROLE_KEY')
ON CONFLICT (id) DO UPDATE SET service_role_key = 'TUA_SERVICE_ROLE_KEY';
"

# 2. Verifica trigger installati
cat verify_triggers.sql | npx prisma db execute --stdin --schema prisma/schema.prisma

# 3. Testa creando un dipendente
```

---

## 📞 Supporto

Se dopo aver seguito questa guida i trigger ancora non funzionano:
1. Controlla i log: Supabase Dashboard > Functions > Logs
2. Verifica PostgreSQL logs per errori trigger
3. Controlla che tutti i trigger siano installati
4. Testa manualmente Edge Function con curl/Postman

---

**Ultima modifica:** 2025-01-14
**Versione:** 1.0
