# 🎨 Configurazione Supabase dall'Interfaccia Web

## 🎯 Obiettivo

Configurare URL e Service Role Key di Supabase **direttamente dall'interfaccia admin**, senza dover eseguire script SQL manualmente ogni volta che cloni il progetto.

---

## ✨ Vantaggi

- ✅ **Zero script SQL da eseguire**: tutto dall'interfaccia web
- ✅ **Portabile**: clona il progetto, configura dall'UI, funziona
- ✅ **User-friendly**: interfaccia grafica invece di comandi SQL
- ✅ **Sicuro**: chiavi salvate nel database, non nel codice
- ✅ **Modificabile**: puoi cambiare la configurazione in qualsiasi momento

---

## 🚀 Setup Iniziale (Prima Volta)

### 1️⃣ Esegui gli Script SQL (solo la prima volta)

Vai su **Supabase Dashboard → SQL Editor** e esegui questi 2 script nell'ordine:

#### Script 1: Aggiungi colonne

Copia e incolla il contenuto di `sql/setup/add_supabase_config_columns.sql`:

```sql
ALTER TABLE public.admin_settings
ADD COLUMN IF NOT EXISTS supabase_url TEXT,
ADD COLUMN IF NOT EXISTS supabase_service_role_key TEXT;
```

Clicca **RUN** ✅

#### Script 2: Aggiorna funzione

Copia e incolla il contenuto di `sql/setup/update_attendance_monitor_function.sql` e clicca **RUN** ✅

### 2️⃣ Configura dall'Interfaccia Web

1. **Accedi come Admin** alla tua applicazione
2. Vai su **Impostazioni → Presenze**
3. Scorri fino alla sezione **"Configurazione Supabase"**
4. Compila i campi:

   **URL Progetto Supabase:**
   - Vai su Supabase Dashboard → Project Settings → API
   - Copia il **Project URL** (es: `https://xxx.supabase.co`)
   - Incollalo nel campo

   **Service Role Key:**
   - Nella stessa pagina (Project Settings → API)
   - Copia la **service_role** key (NON la anon key!)
   - Incollala nel campo (puoi cliccare l'occhio per vedere/nascondere)

5. Clicca **"Salva Configurazione"** ✅

**FATTO!** 🎉 Il sistema di monitoraggio presenze ora userà questi valori.

---

## 🔄 Quando Cloni il Progetto

### Setup Veloce (3 passi):

1. **Clona il repository**
   ```bash
   git clone ...
   ```

2. **Esegui i 2 script SQL** (vedi sopra)
   - `add_supabase_config_columns.sql`
   - `update_attendance_monitor_function.sql`

3. **Configura dall'UI**
   - Accedi come admin
   - Vai in Impostazioni → Presenze → Configurazione Supabase
   - Inserisci i valori del nuovo progetto
   - Salva

**FATTO!** Nessun file da modificare, nessun hardcode! 🚀

---

## 📸 Screenshot Interfaccia

La sezione "Configurazione Supabase" mostra:

```
┌─────────────────────────────────────────────────────────┐
│ 🖥️ Configurazione Supabase                              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ⚠️ Importante: Queste impostazioni sono necessarie      │
│    per il funzionamento del sistema di monitoraggio.    │
│                                                           │
│ URL Progetto Supabase                                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ https://xxx.supabase.co                             │ │
│ └─────────────────────────────────────────────────────┘ │
│ Trova questo URL in: Supabase Dashboard → Project       │
│ Settings → API → Project URL                             │
│                                                           │
│ Service Role Key                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ••••••••••••••••••••••••••••••••••••••••••••••••   👁│ │
│ └─────────────────────────────────────────────────────┘ │
│ Trova questa chiave in: Supabase Dashboard → Project    │
│ Settings → API → service_role key                        │
│                                                           │
│ ⚠️ ATTENZIONE: La Service Role Key è sensibile!         │
│    Non condividerla. Viene salvata in modo sicuro.      │
│                                                           │
│                           [ Salva Configurazione ]       │
│                                                           │
│ 📋 Come trovare questi valori:                           │
│ 1. Vai su Supabase Dashboard                             │
│ 2. Seleziona il tuo progetto                             │
│ 3. Vai in Project Settings → API                         │
│ 4. Copia il Project URL                                  │
│ 5. Copia la service_role key (NON la anon key!)         │
│ 6. Incolla i valori qui sopra e salva                    │
│                                                           │
│ 💡 Quando cloni il progetto: Basta configurare questi   │
│    valori una volta dall'interfaccia admin!              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Come Funziona

### Prima (con hardcode ❌)

```sql
-- Hardcoded nel SQL
SELECT content FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/...',  -- ❌
    ARRAY[http_header('Authorization', 'Bearer eyJ...')]           -- ❌
    ...
));
```

**Problema**: Ogni volta che cloni il progetto, devi modificare manualmente il file SQL.

### Dopo (con UI ✅)

```sql
-- Legge dalla tabella admin_settings (configurata via UI!)
SELECT supabase_url, supabase_service_role_key
INTO v_supabase_url, v_service_role_key
FROM admin_settings
WHERE supabase_url IS NOT NULL;

-- Usa le variabili
SELECT content FROM http((
    'POST',
    v_supabase_url || '/functions/v1/...',           -- ✅ Da UI
    ARRAY[http_header('Authorization', 'Bearer ' || v_service_role_key)]  -- ✅ Da UI
    ...
));
```

**Soluzione**: Configuri una volta dall'interfaccia web, zero modifiche manuali!

---

## 🔐 Sicurezza

### Dove vengono salvati i dati?

- **Tabella**: `admin_settings`
- **Colonne**: `supabase_url`, `supabase_service_role_key`
- **Accesso**: Solo admin (protetto da RLS)
- **Visibilità**: La chiave è nascosta di default nell'UI (campo password)

### Best Practices

1. ✅ **Non committare le chiavi** nel codice
2. ✅ **Usa RLS** per proteggere `admin_settings`
3. ✅ **Ruota le chiavi** periodicamente
4. ✅ **Limita l'accesso** solo agli admin necessari

---

## 🧪 Testing

### Verifica che la configurazione funzioni:

1. **Controlla nel database**:
   ```sql
   SELECT 
       admin_id,
       supabase_url,
       CASE 
           WHEN supabase_service_role_key IS NOT NULL 
           THEN '✅ Configurata'
           ELSE '❌ Non configurata'
       END as key_status
   FROM admin_settings;
   ```

2. **Testa il cron manualmente**:
   ```sql
   SELECT public.attendance_monitor_cron();
   ```

   Se vedi nel risultato:
   - ✅ `"Email: ..."` → Funziona!
   - ❌ `"ERRORE: Configurazione Supabase non trovata"` → Configura dall'UI

3. **Controlla i log del cron**:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'attendance-monitor-cron')
   ORDER BY start_time DESC 
   LIMIT 5;
   ```

---

## 🔧 Troubleshooting

### Errore: "Configurazione Supabase non trovata"

**Soluzione**: Vai in Impostazioni → Presenze → Configurazione Supabase e compila i campi.

### Errore: "URL non valido"

**Soluzione**: L'URL deve essere nel formato `https://xxx.supabase.co` (senza `/` finale).

### Errore: "Service Role Key non valida"

**Soluzione**: 
- Assicurati di copiare la **service_role** key, NON la anon key
- La chiave deve iniziare con `eyJ`
- Copia l'intera chiave (è molto lunga!)

### La sezione non appare nell'UI

**Soluzione**:
1. Verifica di aver eseguito `add_supabase_config_columns.sql`
2. Controlla che le colonne esistano:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'admin_settings' 
     AND column_name IN ('supabase_url', 'supabase_service_role_key');
   ```

### Gli avvisi non arrivano

**Soluzione**:
1. Verifica che la configurazione sia salvata (query sopra)
2. Testa manualmente: `SELECT public.attendance_monitor_cron();`
3. Controlla i log del cron
4. Verifica che l'Edge Function `attendance-monitor` esista

---

## 📊 Confronto: Prima vs Dopo

| Aspetto | Prima (Hardcode) | Dopo (UI Config) |
|---------|------------------|------------------|
| **Setup iniziale** | Modifica file SQL | Compila form web |
| **Dopo clone** | Modifica file SQL | Compila form web |
| **Portabilità** | ❌ Bassa | ✅ Alta |
| **User-friendly** | ❌ Richiede SQL | ✅ Interfaccia grafica |
| **Errori** | ❌ Facili (typo) | ✅ Validazione automatica |
| **Sicurezza** | ❌ Chiavi nel codice | ✅ Chiavi nel DB |
| **Modifiche** | ❌ Riesegui script | ✅ Modifica dal form |

---

## ✅ Checklist Setup

- [ ] Script `add_supabase_config_columns.sql` eseguito
- [ ] Script `update_attendance_monitor_function.sql` eseguito
- [ ] Colonne verificate nel database
- [ ] Accesso come admin all'applicazione
- [ ] Sezione "Configurazione Supabase" visibile
- [ ] URL progetto inserito
- [ ] Service Role Key inserita
- [ ] Configurazione salvata con successo
- [ ] Test manuale funzione riuscito
- [ ] Primo avviso ricevuto correttamente

---

## 🎉 Risultato

Ora puoi clonare il progetto su qualsiasi ambiente e:

1. ✅ Eseguire 2 script SQL (una volta sola)
2. ✅ Configurare dall'interfaccia web
3. ✅ **FATTO!** Zero hardcode, zero modifiche manuali

Il sistema è completamente portabile e user-friendly! 🚀

---

## 📝 Note Tecniche

### Ordine di lettura della configurazione

La funzione `attendance_monitor_cron()` cerca la configurazione in questo ordine:

1. **admin_settings** (configurato via UI) ← Priorità
2. **app.settings.*** (variabili d'ambiente) ← Fallback

Questo garantisce compatibilità con setup esistenti che usano variabili d'ambiente.

### Migrazione da variabili d'ambiente

Se hai già configurato le variabili d'ambiente (`app.settings.*`):

1. La funzione continuerà a funzionare (fallback)
2. Quando configuri dall'UI, userà quei valori (priorità)
3. Puoi rimuovere le variabili d'ambiente se vuoi

---

## 🆘 Supporto

Per problemi:
1. Verifica che gli script SQL siano stati eseguiti
2. Controlla che la configurazione sia salvata nel database
3. Testa manualmente la funzione
4. Consulta i log del cron
5. Verifica che l'Edge Function esista

---

**Domande?** Questa soluzione rende il setup del progetto molto più semplice e user-friendly! 🎨


