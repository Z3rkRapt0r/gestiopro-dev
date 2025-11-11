# 🔔 Sistema di Monitoraggio Presenze - 100% Supabase

## 🎯 Soluzione Semplificata

Questa guida mostra come implementare il monitoraggio presenze usando **solo Supabase**, senza bisogno di Vercel Cron o altri servizi esterni.

---

## 🏗️ Architettura

```
┌─────────────────────────┐
│  pg_cron                │  ← Scheduler Postgres (incluso in Supabase)
│  (ogni 15 min, 8-18)    │
└───────────┬─────────────┘
            │
            ↓ chiama
┌─────────────────────────┐
│  Edge Function          │  ← check-missing-attendance
│  (Supabase Functions)   │     (usa env Supabase)
└───────────┬─────────────┘
            │
            ↓ legge/scrive
┌─────────────────────────┐
│  Database (Postgres)    │  ← Tabelle presenze
└─────────────────────────┘
```

### ✅ Vantaggi

- ✅ **Tutto in Supabase**: un solo servizio da gestire
- ✅ **Zero hardcode**: URL e chiavi dalle variabili d'ambiente
- ✅ **Gratuito**: pg_cron incluso in tutti i piani Supabase
- ✅ **Portabile**: clona il progetto, imposta env, funziona
- ✅ **Semplice**: meno componenti = meno problemi

### ⚖️ Confronto con Vercel Cron

| Aspetto | Supabase Only | Vercel Cron |
|---------|---------------|-------------|
| **Componenti** | 2 (pg_cron + Edge Function) | 3 (Vercel Cron + API + Edge Function) |
| **Costo** | Gratis | Richiede Vercel Pro |
| **Setup** | 1 script SQL | Script SQL + vercel.json + API endpoint |
| **Portabilità** | Alta | Media |
| **Monitoring** | Supabase Dashboard | Vercel + Supabase Dashboard |

---

## 🚀 Setup Completo (Prima Volta)

### Prerequisiti

- Progetto Supabase attivo
- Extension `http` abilitata (di solito già attiva)
- Extension `pg_cron` abilitata (inclusa di default)

### Step 1: Verificare le Extension

```sql
-- Verifica che http extension sia attiva
SELECT * FROM pg_extension WHERE extname = 'http';

-- Se non c'è, abilitala
CREATE EXTENSION IF NOT EXISTS http;

-- Verifica pg_cron
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

### Step 2: Configurare le Variabili d'Ambiente

Hai **2 opzioni**:

#### Opzione A: Usando Supabase Vault (Consigliato - più sicuro)

1. Vai su **Supabase Dashboard → Project Settings → Vault**
2. Aggiungi questi secrets:
   - **Nome**: `supabase_url`
     **Valore**: `https://tuo-progetto.supabase.co`
   
   - **Nome**: `service_role_key`
     **Valore**: `eyJ...` (la tua service role key)

3. Collega i secrets alle impostazioni del database:

```sql
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'vault://supabase_url';

ALTER DATABASE postgres 
SET app.settings.service_role_key = 'vault://service_role_key';

SELECT pg_reload_conf();
```

#### Opzione B: Impostazione Diretta (più semplice, meno sicuro)

```sql
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://tuo-progetto.supabase.co';

ALTER DATABASE postgres 
SET app.settings.service_role_key = 'eyJ...tua-service-role-key';

SELECT pg_reload_conf();
```

⚠️ **Nota**: Con l'Opzione B, le chiavi sono visibili nelle impostazioni del database. Usa Vault se possibile.

### Step 3: Eseguire lo Script SQL

```bash
npx supabase db execute --file sql/cron/attendance_monitor_supabase_only.sql
```

Questo script:
- ✅ Crea la funzione `trigger_attendance_check_via_edge_function()`
- ✅ Schedula il cron job ogni 15 minuti (8-18, lun-ven)
- ✅ Configura tutto senza hardcode

### Step 4: Verificare il Setup

```sql
-- Vedi il cron job attivo
SELECT * FROM cron.job WHERE jobname = 'check-missing-attendance-job';

-- Testa manualmente la funzione
SELECT public.trigger_attendance_check_via_edge_function();

-- Vedi lo storico delle esecuzioni
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-missing-attendance-job')
ORDER BY start_time DESC 
LIMIT 10;
```

---

## 🔄 Setup Dopo un Clone

Quando cloni il progetto su un nuovo Supabase:

### 1. Imposta le Variabili d'Ambiente

```sql
-- Opzione A: Con Vault (nel Dashboard)
-- Crea i secrets, poi:
ALTER DATABASE postgres SET app.settings.supabase_url = 'vault://supabase_url';
ALTER DATABASE postgres SET app.settings.service_role_key = 'vault://service_role_key';

-- Opzione B: Direttamente
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://nuovo-progetto.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'nuova-service-role-key';

SELECT pg_reload_conf();
```

### 2. Esegui lo Script

```bash
npx supabase db execute --file sql/cron/attendance_monitor_supabase_only.sql
```

### 3. Verifica

```sql
SELECT * FROM cron.job WHERE jobname = 'check-missing-attendance-job';
```

**FATTO!** 🎉 Zero file da modificare, zero hardcode.

---

## 🧪 Testing

### Test Manuale della Funzione

```sql
-- Chiama la funzione direttamente
SELECT public.trigger_attendance_check_via_edge_function();

-- Controlla i log
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 5;
```

### Test dell'Edge Function

```bash
curl -X POST \
  https://tuo-progetto.supabase.co/functions/v1/check-missing-attendance \
  -H "Authorization: Bearer TUA-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json"
```

### Verifica Database

```sql
-- Vedi gli avvisi inviati
SELECT * FROM attendance_alerts ORDER BY alert_date DESC LIMIT 10;

-- Vedi la configurazione admin
SELECT admin_id, attendance_alert_enabled, attendance_alert_delay_minutes 
FROM admin_settings 
WHERE attendance_alert_enabled = true;
```

---

## ⚙️ Configurazione

### Modificare lo Schedule

Se vuoi cambiare quando gira il cron (es. ogni 30 minuti invece di 15):

```sql
-- Rimuovi il job esistente
SELECT cron.unschedule('check-missing-attendance-job');

-- Crea con nuovo schedule (ogni 30 min)
SELECT cron.schedule(
  'check-missing-attendance-job',
  '*/30 8-18 * * 1-5',  -- ← Cambia qui
  $$SELECT public.trigger_attendance_check_via_edge_function();$$
);
```

### Formato Cron Schedule

```
┌───────────── minuto (0 - 59)
│ ┌───────────── ora (0 - 23)
│ │ ┌───────────── giorno del mese (1 - 31)
│ │ │ ┌───────────── mese (1 - 12)
│ │ │ │ ┌───────────── giorno della settimana (0 - 6) (0 = domenica)
│ │ │ │ │
* * * * *
```

Esempi:
- `*/15 8-18 * * 1-5` → ogni 15 min, 8-18, lun-ven
- `0 9,14 * * 1-5` → alle 9:00 e 14:00, lun-ven
- `*/30 * * * *` → ogni 30 min, tutti i giorni

---

## 🔧 Troubleshooting

### Gli avvisi non arrivano

1. **Verifica che il cron sia attivo**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'check-missing-attendance-job';
   ```

2. **Controlla le esecuzioni**:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-missing-attendance-job')
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

3. **Verifica le variabili d'ambiente**:
   ```sql
   -- Dovrebbero restituire i valori (o 'vault://...')
   SELECT current_setting('app.settings.supabase_url', true);
   SELECT current_setting('app.settings.service_role_key', true);
   ```

4. **Testa manualmente**:
   ```sql
   SELECT public.trigger_attendance_check_via_edge_function();
   ```

5. **Controlla i log dell'Edge Function**:
   - Supabase Dashboard → Edge Functions → check-missing-attendance → Logs

### Errore "setting not found"

Se vedi `ERROR: unrecognized configuration parameter "app.settings.supabase_url"`:

```sql
-- Imposta le variabili
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://tuo-progetto.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'tua-service-role-key';

-- Ricarica
SELECT pg_reload_conf();
```

### Il cron non parte

1. **Verifica che pg_cron sia attivo**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **Ricrea il job**:
   ```sql
   SELECT cron.unschedule('check-missing-attendance-job');
   -- Poi riesegui lo script
   ```

---

## 📊 Monitoraggio

### Dashboard Supabase

- **Database → Cron Jobs**: vedi tutti i job schedulati
- **Edge Functions → Logs**: dettagli delle esecuzioni
- **Table Editor**: controlla `attendance_alerts`

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

-- Ultime 10 esecuzioni del cron
SELECT 
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-missing-attendance-job')
ORDER BY start_time DESC 
LIMIT 10;

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

1. **Usa Supabase Vault**:
   - Più sicuro di `ALTER DATABASE SET`
   - Chiavi crittografate
   - Audit log

2. **Service Role Key**:
   - Mai committare nel codice
   - Solo in variabili d'ambiente/Vault
   - Ruota periodicamente

3. **RLS Policies**:
   - Tutte le tabelle hanno RLS abilitato
   - Solo admin possono gestire configurazioni

---

## 🆚 Confronto Soluzioni

### Soluzione 1: Supabase Only (Questa)

**Pro**:
- ✅ Tutto in un posto (Supabase)
- ✅ Meno componenti
- ✅ Gratuito
- ✅ Setup più semplice

**Contro**:
- ❌ Monitoring solo su Supabase Dashboard
- ❌ Dipende da pg_cron (ma è molto affidabile)

### Soluzione 2: Vercel Cron + Supabase

**Pro**:
- ✅ Monitoring separato (Vercel Dashboard)
- ✅ Più flessibile (puoi aggiungere logica nell'API)
- ✅ Indipendente dal database

**Contro**:
- ❌ Richiede Vercel Pro ($20/mese)
- ❌ Più componenti da gestire
- ❌ Setup più complesso

---

## 📝 Quale Scegliere?

### Usa **Supabase Only** se:
- ✅ Vuoi la soluzione più semplice
- ✅ Non hai bisogno di Vercel Pro
- ✅ Vuoi tutto in Supabase
- ✅ pg_cron è sufficiente per le tue esigenze

### Usa **Vercel Cron** se:
- ✅ Hai già Vercel Pro
- ✅ Vuoi monitoring separato
- ✅ Hai bisogno di logica custom nell'API
- ✅ Preferisci separare scheduling da database

---

## ✅ Checklist Setup

- [ ] Extension `http` e `pg_cron` verificate
- [ ] Variabili d'ambiente configurate (Vault o ALTER DATABASE)
- [ ] Script SQL eseguito
- [ ] Cron job visibile in `cron.job`
- [ ] Test manuale funzione riuscito
- [ ] Configurazione admin completata
- [ ] Primo avviso ricevuto con successo

🎉 **Sistema pronto!** Ora hai un sistema di monitoraggio 100% Supabase, senza hardcode.

---

## 🔄 Migrazione da Vercel Cron

Se hai già la soluzione con Vercel Cron e vuoi passare a Supabase Only:

1. **Rimuovi da Vercel**:
   - Elimina la sezione `crons` da `vercel.json`
   - Elimina `api/cron/check-attendance.ts`

2. **Segui questa guida**:
   - Imposta le variabili d'ambiente in Supabase
   - Esegui lo script SQL

3. **Verifica**:
   - Testa il cron job
   - Monitora le prime esecuzioni

---

## 🆘 Supporto

Per problemi:
1. Controlla i log: `SELECT * FROM cron.job_run_details`
2. Verifica le variabili: `SELECT current_setting('app.settings.supabase_url', true)`
3. Testa manualmente: `SELECT public.trigger_attendance_check_via_edge_function()`
4. Consulta Troubleshooting sopra

---

**Domande?** Questa soluzione è più semplice, gratuita e completamente portabile! 🚀


