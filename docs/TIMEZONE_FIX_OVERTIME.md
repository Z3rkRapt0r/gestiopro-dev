# 🕐 Fix Timezone per Rilevamento Automatico Straordinari

## 🔍 Problema Identificato

### Sintomo
Quando il sistema rileva automaticamente uno straordinario per check-in anticipato, l'ora mostrata nel messaggio è **1 ora indietro** rispetto all'orario reale del check-in.

**Esempio:**
- Check-in reale: `09:00`
- Messaggio straordinario: `"check-in anticipato alle 08:00"`

---

## 🎯 Causa Root

Il problema è legato alla gestione dei **fusi orari** tra frontend, database e funzioni SQL.

### Flusso del problema:

1. **Frontend** (`src/hooks/useAttendanceOperations.tsx:278`):
   ```typescript
   check_in_time: now.toISOString()
   ```
   - `toISOString()` converte l'ora locale in **UTC**
   - Esempio: `09:00` Italia (UTC+1) → salvato come `08:00` UTC

2. **Database PostgreSQL**:
   - Supabase/PostgreSQL memorizza i timestamp in formato **UTC** (standard)
   - La colonna `check_in_time` è di tipo `TIMESTAMPTZ` (timestamp with timezone)

3. **Funzione SQL** (`calculate_automatic_overtime_checkin`):
   ```sql
   v_check_in_time := NEW.check_in_time::TIME;
   ```
   - Converte `TIMESTAMPTZ` → `TIME` **senza convertire** al fuso orario locale
   - Risultato: legge `08:00` UTC invece di `09:00` Italia

4. **Messaggio straordinario**:
   ```sql
   'Straordinario automatico: check-in anticipato alle ' ||
     TO_CHAR(v_check_in_time, 'HH24:MI')
   ```
   - Mostra `08:00` invece di `09:00` ❌

---

## ✅ Soluzione Implementata

### Modifica alla funzione SQL

**File**: `sql/fixes/fix_timezone_automatic_overtime.sql`

**Cambiamento chiave**:
```sql
-- ❌ PRIMA (SBAGLIATO):
v_check_in_time := NEW.check_in_time::TIME;

-- ✅ DOPO (CORRETTO):
v_check_in_time_local := NEW.check_in_time AT TIME ZONE 'Europe/Rome';
v_check_in_time := v_check_in_time_local::TIME;
```

### Come funziona

1. **Conversione esplicita al fuso orario locale**:
   ```sql
   NEW.check_in_time AT TIME ZONE 'Europe/Rome'
   ```
   - Converte da UTC al fuso orario italiano
   - `08:00` UTC → `09:00` Europe/Rome (UTC+1)
   - `08:00` UTC → `10:00` Europe/Rome (UTC+2 durante DST)

2. **Estrazione del TIME**:
   ```sql
   v_check_in_time_local::TIME
   ```
   - Ora il TIME estratto è corretto: `09:00`

3. **Messaggio corretto**:
   ```
   "Straordinario automatico: check-in anticipato alle 09:00 (orario previsto: 09:30)"
   ```

---

## 🚀 Come Applicare il Fix

### Opzione 1: Script Automatico (Consigliato)

```bash
# Dalla root del progetto
./scripts/apply-timezone-fix.sh
```

### Opzione 2: Manuale tramite Supabase CLI

```bash
# Assicurati di essere loggato
supabase login

# Applica il fix
supabase db execute \
  --project-ref YOUR_PROJECT_REF \
  --file sql/fixes/fix_timezone_automatic_overtime.sql
```

### Opzione 3: Tramite Dashboard Supabase

1. Vai su: https://supabase.com/dashboard
2. Seleziona il tuo progetto
3. Vai su **SQL Editor**
4. Copia e incolla il contenuto di `sql/fixes/fix_timezone_automatic_overtime.sql`
5. Clicca **Run**

---

## 🧪 Testing

### Test di verifica timezone

Il fix include un test automatico che viene eseguito durante l'applicazione:

```sql
DO $$
DECLARE
  test_time TIMESTAMPTZ := '2025-01-10 08:00:00+00'::TIMESTAMPTZ; -- 8:00 AM UTC
  local_time TIME;
BEGIN
  local_time := (test_time AT TIME ZONE 'Europe/Rome')::TIME;
  RAISE NOTICE 'UTC time: %', test_time;
  RAISE NOTICE 'Local time (Europe/Rome): %', local_time;
END $$;
```

**Output atteso:**
```
UTC time: 2025-01-10 08:00:00+00
Local time (Europe/Rome): 09:00:00  (durante inverno, UTC+1)
                       o  10:00:00  (durante estate, UTC+2)
```

### Test reale

1. **Configura orario di lavoro** (es. inizio: 09:00)
2. **Abilita rilevamento automatico straordinari** nelle impostazioni admin
3. **Fai check-in prima dell'orario** (es. 08:45)
4. **Verifica il messaggio straordinario**:
   ```
   ✅ "Straordinario automatico: check-in anticipato alle 08:45 (orario previsto: 09:00)"
   ```

---

## 📊 Impatto

### Prima del fix:
- ❌ Orari sbagliati nei messaggi straordinari
- ❌ Confusione per dipendenti e amministratori
- ❌ Calcoli straordinari comunque corretti (solo il messaggio era sbagliato)

### Dopo il fix:
- ✅ Orari corretti nei messaggi straordinari
- ✅ Sincronizzazione perfetta tra check-in reale e messaggio
- ✅ Gestione automatica del cambio ora solare/legale (DST)

---

## 🔧 Dettagli Tecnici

### Timezone configurato

**Fuso orario**: `Europe/Rome`

Questo fuso orario:
- Include automaticamente il cambio ora solare/legale
- UTC+1 in inverno (ora solare)
- UTC+2 in estate (ora legale)

### Alternativa: Altri fusi orari

Se il tuo sistema opera in un altro fuso orario, modifica questa riga:

```sql
v_check_in_time_local := NEW.check_in_time AT TIME ZONE 'YOUR_TIMEZONE';
```

**Esempi di timezone**:
- `'Europe/Rome'` - Italia
- `'Europe/London'` - Regno Unito
- `'America/New_York'` - New York
- `'UTC'` - UTC (nessuna conversione)

Lista completa: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

---

## 🐛 Troubleshooting

### Il fix non funziona

1. **Verifica che il fix sia stato applicato**:
   ```sql
   SELECT prosrc
   FROM pg_proc
   WHERE proname = 'calculate_automatic_overtime_checkin';
   ```
   - Cerca la stringa `AT TIME ZONE 'Europe/Rome'` nel risultato

2. **Verifica il fuso orario del database**:
   ```sql
   SHOW timezone;
   ```

3. **Test manuale di conversione**:
   ```sql
   SELECT
     '2025-01-10 08:00:00+00'::TIMESTAMPTZ as utc_time,
     ('2025-01-10 08:00:00+00'::TIMESTAMPTZ AT TIME ZONE 'Europe/Rome')::TIME as local_time;
   ```

### Gli straordinari non vengono più rilevati

1. **Verifica che la feature sia abilitata**:
   ```sql
   SELECT enable_auto_overtime_checkin
   FROM admin_settings
   WHERE admin_id = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1);
   ```
   - Deve essere `true`

2. **Controlla i log del trigger**:
   ```sql
   SET client_min_messages = NOTICE;
   -- Poi fai un check-in di test
   ```

---

## 📝 Note Aggiuntive

### Perché UTC nel database?

È una **best practice** salvare tutti i timestamp in UTC perché:
- Evita ambiguità durante i cambi ora
- Facilita calcoli tra fusi orari diversi
- Standard nell'industria software

### Perché convertire solo nella visualizzazione?

La conversione al fuso orario locale dovrebbe avvenire:
- ✅ Nella **visualizzazione** (come in questo fix)
- ✅ Nel **frontend** quando si mostra all'utente
- ❌ **NON** nel salvataggio sul database

---

## 🎓 Risorse

- [PostgreSQL Timezone Functions](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-ZONECONVERT)
- [Supabase Database Settings](https://supabase.com/docs/guides/database)
- [JavaScript Date and Timezone](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)

---

## 📞 Supporto

Se hai problemi con il fix:

1. Controlla i log del database
2. Esegui i test di verifica inclusi nel fix
3. Verifica la configurazione del fuso orario

---

**Data fix**: 2025-01-10
**Versione**: 1.0
**Autore**: Sistema di gestione automatico
