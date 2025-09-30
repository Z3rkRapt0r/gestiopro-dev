# 🧹 Sistema di Cleanup Automatico Notifiche

## 📋 Panoramica

Il sistema di cleanup automatico per le notifiche è progettato per mantenere il database ottimizzato rimuovendo automaticamente le notifiche vecchie e non più necessarie. Il sistema è completamente configurabile e include funzionalità di monitoraggio e logging.

## 🚀 Installazione

### 1. Eseguire gli Script SQL

Esegui gli script in questo ordine:

```sql
-- 1. Sistema base di cleanup
\i sql/cleanup/notifications_cleanup_system.sql

-- 2. Configurazione cron jobs
\i sql/cron/notifications_cleanup_cron.sql
```

### 2. Verifica Installazione

```sql
-- Test completo del sistema
SELECT * FROM public.test_cleanup_system();

-- Verifica configurazione
SELECT * FROM public.cleanup_config;

-- Verifica cron jobs
SELECT * FROM public.get_cron_cleanup_status();
```

## ⚙️ Configurazione

### Configurazione di Default

| Tabella | Retention | Descrizione |
|---------|-----------|-------------|
| `notifications` | 90 giorni | Notifiche ricevute dagli utenti |
| `sent_notifications` | 365 giorni | Cronologia notifiche inviate dagli admin |

### Modificare la Configurazione

```sql
-- Cambia retention per notifications a 60 giorni
UPDATE public.cleanup_config 
SET retention_days = 60 
WHERE table_name = 'notifications';

-- Cambia retention per sent_notifications a 180 giorni
UPDATE public.cleanup_config 
SET retention_days = 180 
WHERE table_name = 'sent_notifications';

-- Disabilita cleanup per una tabella
UPDATE public.cleanup_config 
SET is_enabled = false 
WHERE table_name = 'notifications';
```

## 🔄 Esecuzione Automatica

### Cron Jobs Configurati

1. **Cleanup Settimanale**: Ogni domenica alle 2:00 AM
   - Pulisce tutte le notifiche vecchie secondo la configurazione

2. **Cleanup Notifiche Lette**: Ogni giorno alle 3:00 AM
   - Pulisce le notifiche lette dopo 30 giorni

### Gestione Cron Jobs

```sql
-- Disabilita cron job
SELECT cron.unschedule('notifications-cleanup-weekly');

-- Riabilita cron job
SELECT cron.schedule(
  'notifications-cleanup-weekly',
  '0 2 * * 0',  -- Ogni domenica alle 2:00 AM
  'SELECT public.run_notifications_cleanup();'
);

-- Cambia orario (esempio: ogni giorno alle 1:00 AM)
SELECT cron.unschedule('notifications-cleanup-weekly');
SELECT cron.schedule(
  'notifications-cleanup-daily',
  '0 1 * * *',  -- Ogni giorno alle 1:00 AM
  'SELECT public.run_notifications_cleanup();'
);
```

## 🛠️ Utilizzo Manuale

### Esecuzione Manuale

```sql
-- Cleanup completo (notifications + sent_notifications)
SELECT * FROM public.cleanup_notifications();

-- Cleanup solo notifiche lette
SELECT * FROM public.cleanup_read_notifications(30);

-- Cleanup specifico per tabella
SELECT * FROM public.cleanup_old_records('notifications', 'created_at');
```

### Dry Run (Solo Conta, Non Elimina)

```sql
-- Conta record da eliminare senza eliminarli
SELECT 
  'notifications' as table_name,
  COUNT(*) as records_to_delete
FROM public.notifications n
JOIN public.cleanup_config cc ON cc.table_name = 'notifications'
WHERE n.created_at < NOW() - INTERVAL '1 day' * cc.retention_days;
```

## 📊 Monitoraggio

### Statistiche Sistema

```sql
-- Statistiche complete
SELECT * FROM public.get_cleanup_stats();

-- Cron jobs attivi
SELECT * FROM public.get_cron_cleanup_status();

-- Ultimi log cleanup
SELECT * FROM public.cleanup_logs 
ORDER BY cleanup_date DESC 
LIMIT 10;
```

### Dashboard Monitoraggio

```sql
-- Statistiche giornaliere ultimi 30 giorni
SELECT 
  DATE(cleanup_date) as cleanup_day,
  table_name,
  SUM(records_deleted) as total_deleted,
  AVG(execution_time_ms) as avg_execution_time_ms
FROM public.cleanup_logs
WHERE cleanup_date >= NOW() - INTERVAL '30 days'
GROUP BY DATE(cleanup_date), table_name
ORDER BY cleanup_day DESC;

-- Trend crescita tabelle
SELECT 
  'notifications' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_read = true) as read_records,
  COUNT(*) FILTER (WHERE is_read = false) as unread_records
FROM public.notifications;
```

## 🔧 Funzioni Disponibili

### Funzioni Principali

| Funzione | Descrizione |
|----------|-------------|
| `cleanup_notifications()` | Cleanup completo di entrambe le tabelle |
| `cleanup_old_records(table, date_column)` | Cleanup generico per qualsiasi tabella |
| `cleanup_read_notifications(days)` | Cleanup notifiche lette dopo X giorni |
| `run_notifications_cleanup()` | Wrapper per cron jobs con logging |

### Funzioni di Monitoraggio

| Funzione | Descrizione |
|----------|-------------|
| `get_cleanup_stats()` | Statistiche complete del sistema |
| `get_cron_cleanup_status()` | Stato dei cron jobs |
| `test_cleanup_system()` | Test completo del sistema |

## 📋 Tabelle Create

### `cleanup_config`
Configurazione per ogni tabella da pulire.

```sql
- id (UUID)
- table_name (TEXT) - Nome tabella
- retention_days (INTEGER) - Giorni di retention
- is_enabled (BOOLEAN) - Se il cleanup è abilitato
- last_cleanup_at (TIMESTAMP) - Ultimo cleanup eseguito
- last_cleaned_count (INTEGER) - Record eliminati nell'ultimo cleanup
```

### `cleanup_logs`
Log di tutte le operazioni di cleanup.

```sql
- id (UUID)
- table_name (TEXT) - Tabella pulita
- cleanup_date (TIMESTAMP) - Data/ora cleanup
- records_deleted (INTEGER) - Record eliminati
- retention_days (INTEGER) - Giorni di retention usati
- execution_time_ms (INTEGER) - Tempo di esecuzione in ms
- error_message (TEXT) - Eventuale messaggio di errore
```

## 🚨 Sicurezza

### Row Level Security (RLS)
- Solo gli admin possono gestire la configurazione
- Solo gli admin possono visualizzare i log
- Le funzioni sono `SECURITY DEFINER` per sicurezza

### Backup Raccomandato
Prima di modificare la configurazione, fai sempre un backup:

```sql
-- Backup notifiche che verranno eliminate
CREATE TABLE notifications_backup_20250117 AS 
SELECT * FROM public.notifications 
WHERE created_at < NOW() - INTERVAL '1 day' * (
  SELECT retention_days FROM public.cleanup_config WHERE table_name = 'notifications'
);
```

## 🐛 Troubleshooting

### Problemi Comuni

1. **Cron job non esegue**
   ```sql
   -- Verifica stato cron
   SELECT * FROM public.get_cron_cleanup_status();
   
   -- Verifica log errori
   SELECT * FROM public.cleanup_logs 
   WHERE error_message IS NOT NULL
   ORDER BY cleanup_date DESC;
   ```

2. **Cleanup troppo lento**
   ```sql
   -- Verifica indici
   SELECT * FROM pg_indexes 
   WHERE tablename IN ('notifications', 'sent_notifications');
   
   -- Crea indici se necessario
   CREATE INDEX CONCURRENTLY idx_notifications_created_at 
   ON public.notifications(created_at);
   ```

3. **Troppi record eliminati**
   ```sql
   -- Aumenta retention
   UPDATE public.cleanup_config 
   SET retention_days = 180 
   WHERE table_name = 'notifications';
   ```

### Log di Debug

```sql
-- Abilita logging dettagliato (se necessario)
SET log_statement = 'all';
SET log_duration = on;
```

## 📈 Performance

### Ottimizzazioni Raccomandate

1. **Indici**
   ```sql
   -- Indici per performance cleanup
   CREATE INDEX CONCURRENTLY idx_notifications_created_at_read 
   ON public.notifications(created_at, is_read);
   
   CREATE INDEX CONCURRENTLY idx_sent_notifications_created_at 
   ON public.sent_notifications(created_at);
   ```

2. **Partizionamento** (per tabelle molto grandi)
   ```sql
   -- Esempio partizionamento per mese
   CREATE TABLE notifications_partitioned (
     LIKE public.notifications INCLUDING ALL
   ) PARTITION BY RANGE (created_at);
   ```

## 🔄 Manutenzione

### Attività Periodiche

1. **Settimanale**: Verifica log cleanup
2. **Mensile**: Analizza performance e statistiche
3. **Trimestrale**: Rivedi configurazione retention
4. **Annuale**: Backup e archiviazione log vecchi

### Script di Manutenzione

```sql
-- Pulizia log cleanup vecchi (oltre 1 anno)
DELETE FROM public.cleanup_logs 
WHERE cleanup_date < NOW() - INTERVAL '1 year';

-- Backup configurazione
CREATE TABLE cleanup_config_backup AS 
SELECT * FROM public.cleanup_config;
```

## 📞 Supporto

Per problemi o domande:
1. Verifica i log in `cleanup_logs`
2. Esegui `test_cleanup_system()`
3. Controlla la configurazione in `cleanup_config`
4. Verifica i cron jobs attivi

---

**Note**: Questo sistema è progettato per essere sicuro e reversibile. Tutte le operazioni sono loggare e la configurazione può essere modificata in qualsiasi momento.
