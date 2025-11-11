# 🔧 Rimuovere Hardcode da Attendance Monitor

## 🎯 Obiettivo

Aggiornare la funzione `attendance_monitor_cron()` esistente per usare variabili d'ambiente invece di URL e chiavi hardcoded, **senza toccare il cron job** che già gira ogni 15 minuti.

---

## ⚡ Procedura Rapida (3 passi)

### 1️⃣ Configura le Variabili d'Ambiente

Prima, trova la tua **Service Role Key**:
- Vai su: **Supabase Dashboard → Project Settings → API**
- Copia la `service_role` key (NON la `anon` key!)

Poi esegui (sostituendo con i tuoi valori):

```sql
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://tuo-progetto.supabase.co';

ALTER DATABASE postgres 
SET app.settings.service_role_key = 'eyJ...tua-service-role-key';

SELECT pg_reload_conf();
```

Oppure usa lo script preparato:

```bash
# Modifica prima i valori in sql/setup/configure_env_variables.sql
npx supabase db execute --file sql/setup/configure_env_variables.sql
```

### 2️⃣ Aggiorna la Funzione

```bash
npx supabase db execute --file sql/fixes/fix_attendance_monitor_no_hardcode.sql
```

Questo script:
- ✅ Aggiorna la funzione `attendance_monitor_cron()`
- ✅ **NON tocca** il cron job esistente
- ✅ Mantiene tutta la logica esistente
- ✅ Aggiunge solo l'uso delle variabili d'ambiente

### 3️⃣ Verifica

```sql
-- Testa la funzione manualmente
SELECT public.attendance_monitor_cron();

-- Verifica che il cron sia ancora attivo
SELECT * FROM cron.job WHERE jobname = 'attendance-monitor-cron';
```

**FATTO!** 🎉 Il tuo cron continua a girare ogni 15 minuti, ma ora senza hardcode.

---

## 🔄 Quando Cloni il Progetto

Su un nuovo progetto Supabase:

### 1. Configura le nuove variabili

```sql
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://nuovo-progetto.supabase.co';

ALTER DATABASE postgres 
SET app.settings.service_role_key = 'nuova-service-role-key';

SELECT pg_reload_conf();
```

### 2. Esegui lo script fix

```bash
npx supabase db execute --file sql/fixes/fix_attendance_monitor_no_hardcode.sql
```

### 3. Ricrea il cron (se non esiste)

```sql
SELECT cron.schedule(
    'attendance-monitor-cron',
    '*/15 * * * *',
    'SELECT public.attendance_monitor_cron();'
);
```

**FATTO!** Nessun file SQL da modificare manualmente.

---

## 📊 Cosa Cambia

### ❌ Prima (con hardcode)

```sql
SELECT content INTO edge_response
FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/attendance-monitor',  -- ❌ Hardcoded
    ARRAY[
        http_header('Authorization', 'Bearer eyJhbGci...')  -- ❌ Hardcoded
    ],
    ...
));
```

### ✅ Dopo (con variabili d'ambiente)

```sql
-- Leggi dalle variabili d'ambiente
v_supabase_url := current_setting('app.settings.supabase_url', true);
v_service_role_key := current_setting('app.settings.service_role_key', true);

-- Usa le variabili
SELECT content INTO edge_response
FROM http((
    'POST',
    v_supabase_url || '/functions/v1/attendance-monitor',  -- ✅ Da variabile
    ARRAY[
        http_header('Authorization', 'Bearer ' || v_service_role_key)  -- ✅ Da variabile
    ],
    ...
));
```

---

## 🔍 Verifica Setup

### Controlla le variabili configurate

```sql
-- Verifica URL
SELECT current_setting('app.settings.supabase_url', true);

-- Verifica che la key sia configurata (non mostra il valore per sicurezza)
SELECT 
    CASE 
        WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL 
        THEN '✅ Service Role Key configurata'
        ELSE '❌ Service Role Key NON configurata'
    END as status;
```

### Controlla il cron job

```sql
-- Vedi il cron attivo
SELECT 
    jobname,
    schedule,
    command,
    active
FROM cron.job 
WHERE jobname = 'attendance-monitor-cron';

-- Vedi le ultime esecuzioni
SELECT 
    start_time,
    end_time,
    status,
    return_message
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'attendance-monitor-cron')
ORDER BY start_time DESC 
LIMIT 10;
```

### Testa manualmente

```sql
-- Chiama la funzione direttamente
SELECT public.attendance_monitor_cron();

-- Dovresti vedere nel risultato qualcosa come:
-- "Monitoraggio presenze completato alle 14:30. Nuovi avvisi: 0 | Totali pendenti: 0 | Email: ..."
```

---

## 🛡️ Sicurezza

### ⚠️ IMPORTANTE: Non committare le chiavi!

Il file `sql/setup/configure_env_variables.sql` contiene la tua Service Role Key.

**Opzioni**:

1. **Aggiungi al .gitignore** (consigliato):
   ```bash
   echo "sql/setup/configure_env_variables.sql" >> .gitignore
   ```

2. **Usa un template**:
   - Committa `configure_env_variables.template.sql` con placeholder
   - Ogni sviluppatore crea la sua copia locale con i valori reali

3. **Usa Supabase Vault** (più sicuro):
   ```sql
   -- Nel Dashboard Supabase → Vault, crea i secrets, poi:
   ALTER DATABASE postgres SET app.settings.supabase_url = 'vault://supabase_url';
   ALTER DATABASE postgres SET app.settings.service_role_key = 'vault://service_role_key';
   ```

---

## 🔧 Troubleshooting

### Errore: "unrecognized configuration parameter"

Significa che le variabili non sono state configurate:

```sql
-- Configura le variabili
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://tuo-progetto.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'tua-key';
SELECT pg_reload_conf();
```

### La funzione logga "Variabili d'ambiente non configurate"

Stesso problema: esegui il comando sopra.

### Il cron non parte più

Il cron **non viene toccato** dallo script. Se non parte:

```sql
-- Verifica che esista
SELECT * FROM cron.job WHERE jobname = 'attendance-monitor-cron';

-- Se non esiste, ricrealo
SELECT cron.schedule(
    'attendance-monitor-cron',
    '*/15 * * * *',
    'SELECT public.attendance_monitor_cron();'
);
```

### Gli avvisi non arrivano

1. Verifica che le variabili siano configurate correttamente
2. Testa manualmente: `SELECT public.attendance_monitor_cron();`
3. Controlla i log del cron: `SELECT * FROM cron.job_run_details ...`
4. Verifica che la Edge Function `attendance-monitor` esista e funzioni

---

## ✅ Checklist

- [ ] Service Role Key trovata nel Dashboard Supabase
- [ ] Variabili d'ambiente configurate (ALTER DATABASE)
- [ ] Script fix eseguito (`fix_attendance_monitor_no_hardcode.sql`)
- [ ] Test manuale funzione riuscito
- [ ] Cron job ancora attivo e funzionante
- [ ] File con chiavi aggiunto al .gitignore (o usato Vault)
- [ ] Primo avviso ricevuto con successo

---

## 📝 Riepilogo

| Cosa | Prima | Dopo |
|------|-------|------|
| **URL** | Hardcoded nel SQL | Da variabile d'ambiente |
| **Service Key** | Hardcoded nel SQL | Da variabile d'ambiente |
| **Cron Job** | Attivo | ✅ Ancora attivo (non toccato) |
| **Funzione** | `attendance_monitor_cron()` | ✅ Aggiornata (stessa logica) |
| **Portabilità** | ❌ Devi modificare SQL | ✅ Solo imposta variabili |

---

## 🎉 Risultato

Ora puoi clonare il progetto su un nuovo Supabase e:
1. Impostare 2 variabili d'ambiente
2. Eseguire lo script fix
3. **FATTO!** Zero hardcode da modificare manualmente.

Il tuo cron job `attendance-monitor-cron` continua a girare ogni 15 minuti come sempre, ma ora è completamente portabile! 🚀


