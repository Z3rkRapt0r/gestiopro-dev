# 📁 Organizzazione File SQL

Questa cartella contiene tutti gli script SQL organizzati per categoria.

## 📂 Struttura

### `cron/` (1 file attivo)
Script master per la configurazione e gestione del cron job per gli avvisi presenza.
- **File principale**: `cron_master.sql` - Include tutte le opzioni
- **Opzioni disponibili**:
  - Esecuzione ogni 15 minuti (real-time)
  - Esecuzione giornaliera 8:32 UTC
  - Esecuzione giornaliera 8:32 Italia (timezone-aware)
  - Esecuzione giornaliera 8:32 Europa Centrale

**Cron job attivo**: Scegli l'opzione appropriata in `cron_master.sql`

### `data/` (5 file)
Script per popolare il database con dati iniziali.
- **Festività**: `add_italian_holidays.sql`
- **Impostazioni**: `add_attendance_alert_settings.sql`, `create_app_general_settings_table.sql`
- **Template**: `update_email_templates.sql`, `update_existing_templates.sql`

### `fixes/` (11 file)
Correzioni e soluzioni per problemi specifici del database.
- **Soluzioni complete**: `soluzione_completa.sql`, `soluzione_completa_sicura.sql`, `soluzione_robusta.sql`
- **Fix specifici**: Varie correzioni per problemi puntuali
- **Final**: `final_solution.sql` (soluzione finale implementata)

### `tests/` (4 file)
Script di test, diagnostica e monitoraggio.
- **Test**: `crea_avviso_test.sql`, `test_database_structure.sql`
- **Diagnostica**: `diagnostica_problema.sql`
- **Monitoraggio**: `monitor_sistema.sql`

## 🚀 Come Usare

### Per configurazione cron:
```bash
# Usa il file principale
psql $DATABASE_URL -f sql/cron/setup_cron_job.sql
```

### Per aggiungere dati:
```bash
# Festività italiane
psql $DATABASE_URL -f sql/data/add_italian_holidays.sql

# Impostazioni avvisi
psql $DATABASE_URL -f sql/data/add_attendance_alert_settings.sql
```

### Per fix urgenti:
```bash
# Controlla sql/fixes/ per la soluzione più recente
psql $DATABASE_URL -f sql/fixes/final_solution.sql
```

## 📊 Statistiche
- **Totale file**: 40 (21 attivi + 19 deprecated)
- **File attivi**: 21 (organizzati in 4 categorie)
- **File deprecated**: 19 (versioni obsolete/backup)
- **Cartelle**: 5 (4 attive + 1 deprecated)
- **Riduzione**: -46% file attivi grazie al consolidamento

## 🧹 Pulizia Completata ✅
- [x] Consolidare file cron simili (da 19 a 1 file master)
- [x] Creare struttura cartelle organizzata
- [x] Rimuovere versioni obsolete (in cartella deprecated)
- [ ] Creare script master per altre categorie (fixes, data)
- [x] Documentare meglio ogni script con README

## ⚠️ Importante
**NON eseguire script a caso** - molti sono versioni alternative o fix specifici.
Controlla sempre i commenti nel file prima di eseguirlo!
