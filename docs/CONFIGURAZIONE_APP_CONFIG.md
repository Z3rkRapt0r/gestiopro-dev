# Configurazione app_config - Setup Clone Progetto

## 📋 Panoramica

La tabella `app_config` contiene la configurazione centrale dell'applicazione, inclusi URL e chiavi API di Supabase necessarie per il funzionamento del sistema di monitoraggio presenze.

## 🎯 Quando configurare

Configura questi valori **quando cloni il progetto** per la prima volta o quando cambi ambiente (sviluppo → produzione).

## 🔧 Metodo 1: Configurazione via UI (Consigliato)

### Passo 1: Accedi come Admin
1. Fai login con un account amministratore
2. Vai su **Impostazioni** (icona ingranaggio)

### Passo 2: Naviga alla sezione configurazione
1. Seleziona tab **"Presenze & Monitoraggio"**
2. Clicca su **"Impostazioni Presenze"** nella sidebar
3. Scorri fino alla sezione **"Configurazione Supabase"**

### Passo 3: Inserisci i valori
1. **Project URL**: Vai su Supabase Dashboard → Project Settings → API → copia "Project URL"
   - Formato: `https://xxx.supabase.co`

2. **Service Role Key**: Vai su Supabase Dashboard → Project Settings → API → copia "service_role (secret)"
   - Formato: `eyJ...` (inizia con eyJ)
   - ⚠️ **ATTENZIONE**: Questa è una chiave sensibile, mantienila segreta!

3. Clicca **"Salva Configurazione"**

### Risultato
✅ Il sistema di monitoraggio presenze ora userà questi valori per chiamare le Edge Functions
✅ Non serve più modificare file SQL manualmente!

---

## 🔧 Metodo 2: Configurazione via SQL (Alternativo)

Se preferisci configurare direttamente via SQL:

```sql
-- Aggiorna il record esistente in app_config
UPDATE public.app_config
SET
    project_ref = 'https://TUO-PROJECT-REF.supabase.co',
    anon_key = 'TUA-ANON-KEY',
    service_role_key = 'TUA-SERVICE-ROLE-KEY'
WHERE id = 1;

-- Verifica configurazione
SELECT
    id,
    project_ref,
    CASE
        WHEN service_role_key IS NOT NULL THEN '✅ CONFIGURATA'
        ELSE '❌ NON CONFIGURATA'
    END as service_key_status
FROM public.app_config
WHERE id = 1;
```

### Come trovare i valori

1. **Supabase Dashboard** → Seleziona il tuo progetto
2. **Project Settings** → **API**
3. Copia i valori:
   - **Project URL** → `project_ref`
   - **anon public** → `anon_key`
   - **service_role secret** → `service_role_key`

---

## ✅ Verifica Configurazione

### Test 1: Verifica via UI
1. Vai su Impostazioni → Presenze & Monitoraggio → Configurazione Supabase
2. Se vedi i valori già compilati → ✅ Configurazione OK
3. Se vedi campi vuoti → ⚠️ Configura ora

### Test 2: Verifica via SQL
```sql
SELECT
    CASE
        WHEN project_ref IS NOT NULL AND project_ref != '' THEN '✅'
        ELSE '❌'
    END as project_url_status,
    CASE
        WHEN service_role_key IS NOT NULL AND service_role_key != '' THEN '✅'
        ELSE '❌'
    END as service_key_status
FROM public.app_config
WHERE id = 1;
```

Entrambi devono mostrare ✅

### Test 3: Verifica funzionamento cron
```sql
-- Esegui manualmente il cron
SELECT public.attendance_monitor_cron();
```

Se la configurazione è OK, dovresti vedere:
- `Monitoraggio presenze completato alle XX:XX`
- **NON** deve apparire: `ERRORE: Configurazione Supabase non trovata`

---

## 🚨 Errori Comuni

### Errore: "Configurazione Supabase non trovata"

**Causa**: `service_role_key` non configurata

**Soluzione**:
1. Vai su Impostazioni → Presenze & Monitoraggio → Configurazione Supabase
2. Inserisci il **Service Role Key** dal Supabase Dashboard
3. Salva

### Errore: "URL non valido"

**Causa**: `project_ref` non è un URL completo

**Soluzione**:
- ✅ Corretto: `https://xxx.supabase.co`
- ❌ Errato: `xxx` o `xxx.supabase.co` (manca https://)

### Errore: "Service Role Key non valida"

**Causa**: Hai copiato la anon key invece della service_role key

**Soluzione**:
- Assicurati di copiare la chiave **service_role (secret)**, NON la anon key
- La service_role key è molto più lunga della anon key

---

## 📚 Struttura Tabella

```sql
CREATE TABLE public.app_config (
    id smallint NOT NULL DEFAULT 1,           -- ID fisso = 1
    project_ref text NOT NULL,                -- URL progetto Supabase
    anon_key text NOT NULL,                   -- Chiave pubblica (client-side)
    service_role_key text,                    -- Chiave service role (server-side)
    CONSTRAINT app_config_pkey PRIMARY KEY (id)
);
```

### Colonne

| Colonna | Tipo | Descrizione | Obbligatorio |
|---------|------|-------------|--------------|
| `id` | smallint | ID fisso = 1 | ✅ |
| `project_ref` | text | URL completo progetto | ✅ |
| `anon_key` | text | Chiave pubblica client | ✅ |
| `service_role_key` | text | Chiave server-side | ⚠️ Richiesta per monitoraggio presenze |

---

## 🔐 Sicurezza

### RLS (Row Level Security)

La tabella `app_config` ha le seguenti policy:

- **SELECT**: Tutti possono leggere (necessario per client-side)
- **INSERT/UPDATE/DELETE**: Solo admin possono modificare

### Chiavi Sensibili

| Chiave | Visibilità | Uso |
|--------|-----------|-----|
| `anon_key` | ✅ Pubblica | Client-side, sicura da esporre |
| `service_role_key` | 🔒 Privata | Server-side, **MAI esporre al client** |

⚠️ **IMPORTANTE**: La `service_role_key` bypassa RLS. Deve essere usata SOLO da:
- Funzioni pg_cron (server-side)
- Edge Functions (server-side)
- Script di migrazione (con accesso diretto al DB)

**MAI** esporre la `service_role_key` nel codice client o frontend!

---

## 🔄 Migrazione Automatica

Quando esegui le migrazioni Supabase, il sistema:

1. ✅ Crea automaticamente il record con `id = 1` se non esiste
2. ✅ Lascia i campi vuoti per configurazione manuale
3. ✅ Aggiunge commenti di documentazione

Migrazione: `supabase/migrations/20250111100000_ensure_app_config_record.sql`

---

## 📞 Supporto

Se hai problemi con la configurazione:

1. Verifica di essere loggato come **admin**
2. Controlla che le chiavi siano state copiate correttamente (senza spazi)
3. Esegui i test di verifica sopra descritti
4. Consulta i log del cron: `SELECT public.attendance_monitor_cron();`

---

## ✨ Best Practices

### Quando cloni il progetto

1. ✅ Esegui prima tutte le migrazioni
2. ✅ Configura `app_config` PRIMA di abilitare il monitoraggio presenze
3. ✅ Testa con `SELECT public.attendance_monitor_cron();`
4. ✅ Verifica che non ci siano errori nel log

### Ambienti multipli (dev/staging/prod)

Ogni ambiente deve avere la propria configurazione in `app_config`:

- **Dev**: Usa chiavi del progetto Supabase di sviluppo
- **Staging**: Usa chiavi del progetto Supabase di staging
- **Production**: Usa chiavi del progetto Supabase di produzione

⚠️ **MAI** usare chiavi di produzione in sviluppo!

---

**Ultimo aggiornamento**: 11 Novembre 2025
