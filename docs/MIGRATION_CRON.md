# Migrazione Cron Jobs

## Situazione

Hai già `pg_cron` installato e funzionante!
I cron job sono già stati migrati con il database.

---

## ✅ SOLUZIONE: Nessun problema!

### Verifica cron esistenti

```sql
-- Verifica pg_cron sia installato
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_cron';

-- Lista tutti i cron job
SELECT * FROM cron.job;

-- Vedi log esecuzioni
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### I tuoi cron job attuali

```sql
-- attendance_monitor_cron
-- Già configurato e funzionante dopo i fix che abbiamo applicato!
```

### Se devi creare nuovi cron

```sql
-- Esempio: Pulizia notifiche ogni giorno alle 2:00
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * *',
  $$
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND read = true;
  $$
);

-- Esempio: Controllo presenze ogni 30 minuti dalle 8 alle 18
SELECT cron.schedule(
  'check-attendance',
  '*/30 8-18 * * 1-5',  -- Ogni 30 min, lun-ven, 8-18
  $$
  SELECT public.attendance_monitor_cron();
  $$
);
```

### Monitorare i cron

```sql
-- Ultimi 20 job eseguiti con risultato
SELECT
  job_id,
  jobname,
  status,
  return_message,
  start_time,
  end_time,
  (end_time - start_time) as duration
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- Job falliti
SELECT * FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC;
```

---

## Alternative (se pg_cron non funziona)

### OPZIONE B: node-cron nel API Server

Se per qualche motivo pg_cron non funzionasse nel self-hosted:

```bash
npm install node-cron
```

```javascript
// api-server/src/cron.js
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Controllo presenze ogni 30 minuti dalle 8 alle 18, lun-ven
cron.schedule('*/30 8-18 * * 1-5', async () => {
  console.log('Running attendance check...');

  const { data, error } = await supabase.rpc('attendance_monitor_cron');

  if (error) {
    console.error('Cron error:', error);
  } else {
    console.log('Cron result:', data);
  }
});

// Pulizia notifiche ogni giorno alle 2:00
cron.schedule('0 2 * * *', async () => {
  console.log('Cleaning old notifications...');

  await supabase
    .from('notifications')
    .delete()
    .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .eq('read', true);
});

console.log('Cron jobs scheduled');
```

**Pro:**
- Più facile da debuggare
- Logs più chiari
- Può fare qualsiasi cosa (non solo SQL)

**Contro:**
- Devi mantenere il processo Node.js sempre attivo
- Un altro servizio da monitorare

---

## 🎯 RACCOMANDAZIONE

**USA PG_CRON** (quello che hai già!)

È installato, funziona, ed è più affidabile.
L'unico accorgimento: assicurati che il container PostgreSQL sia sempre attivo.

### Monitoring con Coolify

Coolify monitora automaticamente i container.
Se PostgreSQL si spegne, Coolify lo riavvia e pg_cron riprende automaticamente.

---

## Checklist Migrazione Cron

- [x] pg_cron installato (già fatto nella migrazione DB)
- [x] Cron job esistenti migrati (già fatto)
- [x] Funzioni PL/pgSQL funzionanti (abbiamo appena fixato tutto!)
- [ ] Verifica log cron: `SELECT * FROM cron.job_run_details`
- [ ] Configura alerting se un cron fallisce
- [ ] Documenta tutti i cron job attivi

**Tempo stimato**: 1 ora (solo verifica, già tutto ok!)
