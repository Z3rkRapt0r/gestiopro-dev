# 🔧 Fix: Errore "relation does not exist" nel Cron Job

## 🔍 Problema

### Sintomo
Il cron job `attendance_monitor_cron` fallisce con l'errore:
```
ERRORE alle 16:04: relation "admin_settings" does not exist
```

### Esempio di errore
```sql
SELECT public.attendance_monitor_cron();
-- Output: ERRORE alle 16:04: relation "admin_settings" does not exist
```

---

## 🎯 Causa Root

### Il problema del `search_path`

PostgreSQL usa il concetto di `search_path` per determinare in quali schemi cercare le tabelle quando non viene specificato esplicitamente lo schema.

**Scenario normale:**
```sql
-- Con search_path = public, pg_catalog
SELECT * FROM admin_settings;  -- ✅ Trova public.admin_settings
```

**Scenario del cron job:**
```sql
-- Il cron job esegue con un search_path che NON include 'public'
-- Quindi quando esegue:
SELECT * FROM admin_settings;  -- ❌ Non trova la tabella!
```

### Perché succede con i cron job?

I cron job di Supabase/PostgreSQL:
1. Vengono eseguiti in un **contesto isolato**
2. Hanno un `search_path` **predefinito** che potrebbe non includere `public`
3. La funzione è definita come `SECURITY DEFINER`, quindi mantiene i privilegi del creatore ma **non eredita il search_path**

---

## ✅ Soluzione Implementata

### Fix 1: Specificare esplicitamente lo schema

**Prima (sbagliato):**
```sql
SELECT COUNT(*) INTO admin_count
FROM admin_settings  -- ❌ Schema non specificato
WHERE attendance_alert_enabled = true;
```

**Dopo (corretto):**
```sql
SELECT COUNT(*) INTO admin_count
FROM public.admin_settings  -- ✅ Schema esplicito
WHERE attendance_alert_enabled = true;
```

### Fix 2: Impostare il `search_path` nella funzione

Aggiunto nella definizione della funzione:
```sql
CREATE OR REPLACE FUNCTION public.attendance_monitor_cron()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- 🔧 AGGIUNTO
AS $$
...
```

Questo garantisce che la funzione **sempre** cerca prima nello schema `public`.

---

## 📋 Tabelle Corrette

Il fix aggiunge `public.` a tutte queste tabelle:

1. ✅ `public.admin_settings`
2. ✅ `public.profiles`
3. ✅ `public.attendance_check_triggers`
4. ✅ `public.employee_work_schedules`
5. ✅ `public.work_schedules`
6. ✅ `public.leave_requests`
7. ✅ `public.attendances`
8. ✅ `public.attendance_alerts`

---

## 🚀 Come Applicare il Fix

### Opzione 1: Script Automatico (Consigliato)

```bash
# Dalla root del progetto
./scripts/apply-cron-schema-fix.sh
```

### Opzione 2: Manuale tramite Supabase CLI

```bash
# Assicurati di essere loggato
supabase login

# Applica il fix
supabase db execute \
  --project-ref YOUR_PROJECT_REF \
  --file sql/fixes/fix_cron_schema_path.sql
```

### Opzione 3: Tramite Dashboard Supabase

1. Vai su: https://supabase.com/dashboard
2. Seleziona il tuo progetto
3. Vai su **SQL Editor**
4. Copia e incolla il contenuto di `sql/fixes/fix_cron_schema_path.sql`
5. Clicca **Run**

---

## 🧪 Testing

### Test 1: Esecuzione manuale della funzione

```sql
-- Testa la funzione direttamente
SELECT public.attendance_monitor_cron();
```

**Output atteso:**
```
Monitoraggio presenze completato alle 16:04. Nuovi avvisi: 0 | Totali pendenti: 0 | Email: Nessun nuovo avviso creato
```

**NON più:**
```
ERRORE alle 16:04: relation "admin_settings" does not exist
```

### Test 2: Verifica search_path della funzione

```sql
-- Controlla che la funzione abbia il search_path corretto
SELECT
  proname,
  prosrc,
  proconfig  -- Dovrebbe mostrare "search_path=public, pg_temp"
FROM pg_proc
WHERE proname = 'attendance_monitor_cron';
```

### Test 3: Verifica cron job attivo

```sql
-- Verifica che il cron job sia configurato
SELECT
  jobname,
  schedule,
  command,
  active,
  last_run_status
FROM cron.job
WHERE jobname = 'attendance-monitor-cron';
```

---

## 📊 Impatto

### Prima del fix:
- ❌ Il cron job falliva ogni 15 minuti
- ❌ Gli alert di presenza mancante non venivano creati
- ❌ Le email di notifica non venivano inviate
- ❌ Log pieni di errori "relation does not exist"

### Dopo il fix:
- ✅ Il cron job funziona correttamente
- ✅ Gli alert vengono creati quando necessario
- ✅ Le email vengono inviate agli amministratori
- ✅ Sistema di monitoraggio presenze completamente funzionante

---

## 🔧 Dettagli Tecnici

### Cos'è il `search_path`?

Il `search_path` è come la variabile `PATH` di Unix/Linux, ma per gli schemi PostgreSQL:

```sql
-- Mostra il search_path corrente
SHOW search_path;
-- Output tipico: "$user", public

-- Imposta un search_path personalizzato
SET search_path = public, myschema, pg_catalog;
```

### Perché `SECURITY DEFINER` non eredita il search_path?

Le funzioni `SECURITY DEFINER`:
- Eseguono con i **privilegi** del creatore
- Ma **NON** ereditano automaticamente il `search_path` del creatore
- Richiedono un `SET search_path` esplicito nella definizione

**Esempio:**
```sql
-- ❌ SBAGLIATO: search_path non definito
CREATE FUNCTION my_function()
RETURNS void
SECURITY DEFINER
AS $$ ... $$;

-- ✅ CORRETTO: search_path esplicito
CREATE FUNCTION my_function()
RETURNS void
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ ... $$;
```

### Perché `public` e `pg_temp`?

- **`public`**: Schema predefinito dove sono le nostre tabelle
- **`pg_temp`**: Schema per tabelle temporanee (necessario per alcune operazioni)

---

## 🐛 Troubleshooting

### Il fix non funziona ancora

1. **Verifica che il fix sia stato applicato**:
   ```sql
   SELECT prosrc
   FROM pg_proc
   WHERE proname = 'attendance_monitor_cron';
   ```
   - Cerca `public.admin_settings` nel risultato
   - Cerca `SET search_path = public, pg_temp` nell'header

2. **Verifica che la funzione esista**:
   ```sql
   SELECT routine_name, routine_schema
   FROM information_schema.routines
   WHERE routine_name = 'attendance_monitor_cron';
   ```

3. **Controlla i log del cron**:
   - Dashboard Supabase → Logs → Function Logs
   - Cerca messaggi `[Attendance Monitor Cron]`

### Ancora errori di "relation does not exist"

Se vedi ancora l'errore per altre tabelle:

1. **Identifica la tabella mancante** dal messaggio di errore
2. **Aggiungi `public.` davanti** nella query SQL
3. **Applica il fix** aggiornato

### Il cron non viene eseguito

1. **Verifica che il cron job sia attivo**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'attendance-monitor-cron';
   ```

2. **Se non esiste, ricrealo**:
   ```sql
   SELECT cron.schedule(
       'attendance-monitor-cron',
       '*/15 * * * *',
       'SELECT public.attendance_monitor_cron();'
   );
   ```

---

## 📚 Best Practices per Cron Jobs

### 1. Sempre specificare lo schema

```sql
-- ✅ BUONO
SELECT * FROM public.my_table;

-- ❌ CATTIVO (nei cron jobs)
SELECT * FROM my_table;
```

### 2. Usare `SET search_path` nelle funzioni

```sql
CREATE FUNCTION my_cron_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- 👈 IMPORTANTE
AS $$ ... $$;
```

### 3. Testare sempre manualmente prima di schedulare

```sql
-- Prima di creare il cron, testa la funzione
SELECT public.my_cron_function();

-- Se funziona, allora crea il cron
SELECT cron.schedule('my-cron', '*/15 * * * *', 'SELECT public.my_cron_function();');
```

### 4. Aggiungere logging dettagliato

```sql
RAISE NOTICE '[My Cron] Starting execution...';
RAISE NOTICE '[My Cron] Processed % records', record_count;
```

---

## 🎓 Risorse

- [PostgreSQL search_path Documentation](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)
- [SECURITY DEFINER Functions](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [pg_cron Extension](https://github.com/citusdata/pg_cron)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)

---

## 📞 Supporto

Se hai ancora problemi dopo aver applicato il fix:

1. Controlla i log dettagliati
2. Verifica il search_path della funzione
3. Testa manualmente con `SELECT public.attendance_monitor_cron();`
4. Controlla che tutte le tabelle esistano nello schema `public`

---

**Data fix**: 2025-01-10
**Versione**: 1.0
**Issue**: relation "admin_settings" does not exist in cron job
**Soluzione**: Aggiunto `public.` prefix e `SET search_path`
