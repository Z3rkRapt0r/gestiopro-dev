# Migrazione Ottimizzazione Tabelle Presenze

## Panoramica

Questo documento descrive la migrazione per ottimizzare le tabelle delle presenze, separando le presenze automatiche da quelle manuali e rimuovendo la ridondanza causata dalla tabella `unified_attendances`.

## Problema Identificato

### Struttura Attuale (Problematica)
```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   attendances   │    │ unified_attendances  │    │ manual_attendances  │
│ (automatiche)   │    │ (automatiche +       │    │ (NON UTILIZZATA)    │
│                 │    │  manuali)            │    │                     │
└─────────────────┘    └──────────────────────┘    └─────────────────────┘
```

**Problemi:**
- Ridondanza di dati tra `attendances` e `unified_attendances`
- Presenze manuali salvate in `unified_attendances` invece che in `manual_attendances`
- Query complesse per separare automatiche da manuali
- Logica dispersa tra tabelle

### Struttura Ottimizzata (Obiettivo)
```
┌─────────────────┐    ┌─────────────────────┐
│   attendances   │    │ manual_attendances  │
│ (solo automatiche)│    │ (solo manuali)     │
│ + campi aggiuntivi│    │ + campi aggiuntivi │
└─────────────────┘    └─────────────────────┘
```

## Modifiche Implementate

### 1. Database Schema

#### Tabelle Aggiornate:
- **`attendances`**: Presenze automatiche del dipendente
- **`manual_attendances`**: Presenze manuali inserite dall'admin

#### Nuovi Campi Aggiunti:
```sql
-- Per entrambe le tabelle:
is_late BOOLEAN DEFAULT FALSE
late_minutes INTEGER DEFAULT 0
operation_path TEXT
readable_id TEXT
is_sick_leave BOOLEAN DEFAULT FALSE

-- Solo per manual_attendances:
is_business_trip BOOLEAN DEFAULT FALSE
```

### 2. Hooks Aggiornati

#### Nuovi Hooks:
- **`useOptimizedAttendances`**: Hook unificato per entrambi i tipi di presenze
- **`useAttendances`**: Aggiornato per presenze automatiche
- **`useManualAttendances`**: Aggiornato per usare `manual_attendances`

#### Hooks Deprecati:
- **`useUnifiedAttendances`**: Sostituito da `useOptimizedAttendances`

### 3. Componenti Aggiornati

- **`ManualAttendanceForm`**: Usa `useOptimizedAttendances`
- **`ManualAttendancesList`**: Usa `useOptimizedAttendances`

### 4. Tipi TypeScript

Aggiornati i tipi in `src/integrations/supabase/types.ts` per includere i nuovi campi.

## Piano di Migrazione

### Fase 1: Preparazione
1. ✅ Creare script di migrazione SQL
2. ✅ Aggiornare hooks e componenti React
3. ✅ Aggiornare tipi TypeScript

### Fase 2: Esecuzione Migrazione Database

#### Passo 1: Eseguire la Migrazione Principale
```bash
# Eseguire lo script di migrazione
psql -d your_database -f sql/migrations/20250117000000_optimize_attendance_tables.sql
```

**Cosa fa questo script:**
- Aggiunge colonne mancanti alle tabelle `attendances` e `manual_attendances`
- Migra dati da `unified_attendances` alle tabelle corrette
- Crea indici per performance
- Aggiorna policy RLS
- Crea vista temporanea per compatibilità

#### Passo 2: Verificare la Migrazione
```sql
-- Verificare che i dati siano stati migrati correttamente
SELECT COUNT(*) FROM unified_attendances WHERE is_manual = false;
SELECT COUNT(*) FROM attendances;
-- I conteggi devono essere uguali

SELECT COUNT(*) FROM unified_attendances WHERE is_manual = true;
SELECT COUNT(*) FROM manual_attendances;
-- I conteggi devono essere uguali
```

### Fase 3: Test dell'Applicazione

1. **Test Presenze Automatiche:**
   - Verificare che il check-in/out funzioni
   - Controllare che le presenze automatiche vengano salvate in `attendances`

2. **Test Presenze Manuali:**
   - Verificare che l'inserimento manuale funzioni
   - Controllare che le presenze manuali vengano salvate in `manual_attendances`

3. **Test Visualizzazione:**
   - Verificare che i dashboard mostrino le presenze corrette
   - Controllare che i filtri funzionino

### Fase 4: Cleanup (DOPO i test)

#### Passo 1: Eseguire il Cleanup
```bash
# IMPORTANTE: Eseguire solo DOPO aver verificato che tutto funzioni
psql -d your_database -f sql/migrations/20250117000001_cleanup_unified_attendances.sql
```

**Cosa fa questo script:**
- Verifica che tutti i dati siano stati migrati
- Rimuove trigger e funzioni di `unified_attendances`
- Rimuove policy RLS
- Rimuove indici
- Rimuove la vista temporanea
- **RIMUOVE la tabella `unified_attendances`** (IRREVERSIBILE!)

## Rollback Plan

Se qualcosa va storto durante la migrazione:

### Rollback Fase 2 (Database)
```sql
-- Ripristinare la vista temporanea se rimossa
CREATE OR REPLACE VIEW public.unified_attendances_view AS
SELECT 
    id,
    user_id,
    date,
    check_in_time::TEXT as check_in_time,
    check_out_time::TEXT as check_out_time,
    false as is_manual,
    false as is_business_trip,
    COALESCE(is_sick_leave, false) as is_sick_leave,
    COALESCE(is_late, false) as is_late,
    COALESCE(late_minutes, 0) as late_minutes,
    operation_path,
    readable_id,
    null as notes,
    null as created_by,
    created_at,
    updated_at
FROM public.attendances
UNION ALL
SELECT 
    id,
    user_id,
    date,
    check_in_time::TEXT as check_in_time,
    check_out_time::TEXT as check_out_time,
    true as is_manual,
    COALESCE(is_business_trip, false) as is_business_trip,
    COALESCE(is_sick_leave, false) as is_sick_leave,
    COALESCE(is_late, false) as is_late,
    COALESCE(late_minutes, 0) as late_minutes,
    operation_path,
    readable_id,
    notes,
    created_by,
    created_at,
    updated_at
FROM public.manual_attendances;
```

### Rollback Fase 3 (Codice)
- Ripristinare i componenti per usare `useUnifiedAttendances`
- Ripristinare i vecchi hooks

## Benefici dell'Ottimizzazione

### Performance
- ✅ Eliminazione di query complesse per separare automatiche da manuali
- ✅ Indici ottimizzati per entrambe le tabelle
- ✅ Riduzione della ridondanza di dati

### Manutenibilità
- ✅ Logica chiara: automatiche in `attendances`, manuali in `manual_attendances`
- ✅ Codice più semplice e comprensibile
- ✅ Separazione delle responsabilità

### Scalabilità
- ✅ Migliore performance con grandi volumi di dati
- ✅ Query più efficienti
- ✅ Indici specifici per ogni tipo di presenza

## Monitoraggio Post-Migrazione

### Metriche da Monitorare
1. **Performance Query:**
   - Tempo di risposta delle query sulle presenze
   - Utilizzo degli indici

2. **Funzionalità:**
   - Check-in/out automatici funzionanti
   - Inserimento presenze manuali funzionante
   - Dashboard e report corretti

3. **Dati:**
   - Conteggio presenze automatiche in `attendances`
   - Conteggio presenze manuali in `manual_attendances`
   - Verifica che non ci siano duplicati

## Supporto

Per problemi o domande sulla migrazione:
1. Controllare i log dell'applicazione
2. Verificare le query SQL nei log di Supabase
3. Controllare che tutti i componenti usino i nuovi hooks

---

**Data Creazione:** 2025-01-17  
**Versione:** 1.0  
**Stato:** Pronto per l'esecuzione
