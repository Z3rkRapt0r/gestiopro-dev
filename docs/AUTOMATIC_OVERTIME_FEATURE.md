# 🎯 Straordinari Automatici (Check-in Anticipato)

## Panoramica

Questa funzionalità permette al sistema di registrare automaticamente gli straordinari quando un dipendente effettua il check-in prima dell'orario lavorativo previsto.

## 📋 Funzionalità Implementate

### 1. **Configurazione Amministratore**

L'amministratore può configurare la funzionalità dalla sezione **Impostazioni → Presenze → Straordinari Automatici**:

- ✅ **Abilita Rilevamento Automatico**: Toggle per attivare/disattivare la funzione
- ✅ **Tolleranza (minuti)**: Numero di minuti di tolleranza prima di considerare lo straordinario
  - Default: 15 minuti
  - Range: 0-60 minuti

**Esempio**: Con tolleranza di 15 minuti e orario di inizio alle 09:00:
- Check-in alle 08:50 → Nessuno straordinario (entro tolleranza)
- Check-in alle 08:30 → Straordinario di 30 minuti

### 2. **Calcolo Automatico**

Il sistema calcola automaticamente gli straordinari quando:

1. La funzionalità è **attivata** nelle impostazioni
2. Il dipendente ha un **turno lavorativo assegnato** per quel giorno
3. Il check-in avviene **prima** dell'orario di inizio turno
4. La differenza supera la **tolleranza** impostata

**Formula**: `straordinario = orario_inizio_turno - orario_check_in - tolleranza`

### 3. **Registrazione Automatica**

Quando vengono rilevati straordinari, il sistema crea automaticamente un record con:

- **Data**: Giorno del check-in
- **Durata**: Minuti calcolati
- **Tipo**: `automatic_checkin`
- **Stato**: `pending` (Da approvare)
- **Descrizione**: Generata automaticamente con orari

**Esempio di descrizione**:
```
Straordinario automatico: check-in anticipato alle 08:30 (orario previsto: 09:00)
```

### 4. **Blocco Inserimento Manuale**

Per evitare duplicati:

- ❌ **Non è possibile** inserire uno straordinario manuale per una data che ha già uno straordinario automatico
- ⚠️ Il calendario mostra le date bloccate
- 🗑️ L'amministratore deve **eliminare** lo straordinario automatico prima di poter inserire uno manuale

### 5. **Visualizzazione nell'Archivio**

Gli straordinari nell'archivio mostrano:

- 🔵 **Badge "Automatico"** con icona fulmine (⚡) per straordinari automatici
- ⚪ **Badge "Manuale"** con icona utente (👤) per straordinari manuali
- 🟡 **Badge stato**: "Da approvare" / "Approvato" / "Rifiutato" (solo per automatici)
- 📝 **Descrizione**: Motivo dello straordinario
- ⏱️ **Minuti calcolati**: Visualizzazione dei minuti esatti

## 🗄️ Struttura Database

### Tabella: `admin_settings`

Nuove colonne aggiunte:

```sql
enable_auto_overtime_checkin BOOLEAN DEFAULT false
auto_overtime_tolerance_minutes INTEGER DEFAULT 15
```

### Tabella: `overtime_records`

Nuove colonne aggiunte:

```sql
overtime_type VARCHAR(20) DEFAULT 'manual' 
  CHECK (overtime_type IN ('manual', 'automatic_checkin', 'automatic_checkout'))
is_automatic BOOLEAN DEFAULT false
calculated_minutes INTEGER
approval_status VARCHAR(20) DEFAULT 'pending' 
  CHECK (approval_status IN ('pending', 'approved', 'rejected'))
```

### Funzioni Database

#### `calculate_automatic_overtime_checkin()`

Trigger function che:
1. Verifica se la funzionalità è attiva
2. Recupera il turno lavorativo del dipendente
3. Calcola la differenza tra check-in e orario previsto
4. Crea il record di straordinario se supera la tolleranza

#### `has_automatic_overtime_for_date(user_id, date)`

Funzione helper per verificare se esiste già uno straordinario automatico per una data.

#### `get_blocked_overtime_dates(user_id, start_date, end_date)`

Restituisce le date bloccate per l'inserimento manuale.

### Trigger

```sql
trigger_automatic_overtime_checkin
  AFTER INSERT OR UPDATE OF check_in_time ON attendances
  FOR EACH ROW
  EXECUTE FUNCTION calculate_automatic_overtime_checkin()
```

## 📁 File Modificati/Creati

### Migrazione Database
- `supabase/migrations/20250108000000_add_automatic_overtime_detection.sql`

### Componenti Frontend
- `src/components/attendance/AutomaticOvertimeSettings.tsx` (nuovo)
- `src/components/attendance/AttendanceSettings.tsx` (modificato)
- `src/components/overtime/OvertimeEntryForm.tsx` (modificato)
- `src/components/overtime/OvertimeArchiveByYear.tsx` (modificato)
- `src/components/overtime/OvertimeArchiveSection.tsx` (modificato)

### Hooks
- `src/hooks/useAutomaticOvertimeSettings.tsx` (nuovo)
- `src/hooks/useOvertimeConflicts.tsx` (modificato)

## 🚀 Come Usare

### Per l'Amministratore

1. **Attivare la funzionalità**:
   - Vai su **Dashboard → Impostazioni → Presenze**
   - Scorri fino a **Straordinari Automatici (Check-in)**
   - Attiva il toggle **Abilita Rilevamento Automatico**
   - Imposta la **Tolleranza** desiderata (default: 15 minuti)
   - Clicca **Salva Impostazioni**

2. **Visualizzare gli straordinari automatici**:
   - Vai su **Dashboard → Straordinari → Archivio**
   - Gli straordinari automatici hanno il badge blu "Automatico" ⚡
   - Visualizza lo stato di approvazione (Da approvare/Approvato/Rifiutato)

3. **Gestire gli straordinari automatici**:
   - Elimina uno straordinario automatico se necessario
   - Dopo l'eliminazione, puoi inserire uno straordinario manuale per quella data

### Per il Dipendente

1. **Check-in anticipato**:
   - Effettua il check-in normalmente tramite l'app
   - Se arrivi prima dell'orario previsto (oltre la tolleranza), lo straordinario viene registrato automaticamente

2. **Visualizzare i propri straordinari**:
   - Vai su **Dashboard → I Miei Straordinari**
   - Visualizza gli straordinari automatici con il badge "Automatico"
   - Controlla lo stato di approvazione

## ⚠️ Note Importanti

1. **Turno Lavorativo Richiesto**: Il calcolo automatico funziona solo se il dipendente ha un turno assegnato per quel giorno

2. **Nessun Duplicato**: Non è possibile avere sia uno straordinario automatico che uno manuale per la stessa data

3. **Stato Pending**: Gli straordinari automatici vengono creati con stato "Da approvare" e potrebbero richiedere approvazione amministrativa

4. **Tolleranza**: La tolleranza serve per evitare di registrare straordinari per piccole anticipazioni (es. 5 minuti)

5. **Solo Check-in**: Attualmente la funzionalità è implementata solo per il check-in anticipato. Il check-out posticipato può essere aggiunto in futuro con `automatic_checkout`

## 🔧 Configurazione Tecnica

### Variabili di Configurazione

```typescript
interface AutomaticOvertimeSettings {
  enable_auto_overtime_checkin: boolean;  // Default: false
  auto_overtime_tolerance_minutes: number; // Default: 15
}
```

### Permessi RLS

Le policy RLS garantiscono che:
- Gli utenti possano vedere solo i propri straordinari
- Gli admin possano vedere e gestire tutti gli straordinari
- Gli admin possano approvare/rifiutare straordinari automatici

## 📊 Esempi di Utilizzo

### Scenario 1: Check-in Molto Anticipato

- **Orario previsto**: 09:00
- **Tolleranza**: 15 minuti
- **Check-in effettivo**: 08:00
- **Risultato**: Straordinario di 45 minuti (60 - 15)

### Scenario 2: Check-in Leggermente Anticipato

- **Orario previsto**: 09:00
- **Tolleranza**: 15 minuti
- **Check-in effettivo**: 08:50
- **Risultato**: Nessuno straordinario (entro tolleranza)

### Scenario 3: Senza Turno Assegnato

- **Check-in effettivo**: 08:00
- **Turno assegnato**: Nessuno
- **Risultato**: Nessuno straordinario (manca il riferimento)

## 🐛 Troubleshooting

### Gli straordinari non vengono creati automaticamente

1. Verifica che la funzionalità sia **attivata** nelle impostazioni
2. Controlla che il dipendente abbia un **turno assegnato** per quel giorno
3. Verifica che la differenza superi la **tolleranza** impostata
4. Controlla i log del database per eventuali errori

### Non riesco a inserire uno straordinario manuale

- Verifica se esiste già uno straordinario **automatico** per quella data
- Se sì, elimina prima lo straordinario automatico dall'archivio
- Poi potrai inserire quello manuale

### La tolleranza non funziona come previsto

- La tolleranza è in **minuti**
- Assicurati di aver salvato le impostazioni dopo la modifica
- Ricarica la pagina per applicare le nuove impostazioni

## 🔮 Sviluppi Futuri

Possibili estensioni della funzionalità:

1. **Straordinari Check-out**: Rilevamento automatico per check-out posticipati
2. **Approvazione Automatica**: Opzione per approvare automaticamente straordinari sotto una certa soglia
3. **Notifiche**: Alert per admin quando vengono rilevati straordinari automatici
4. **Report**: Dashboard dedicata per analisi straordinari automatici vs manuali
5. **Regole Personalizzate**: Tolleranze diverse per dipendenti/reparti diversi

## 📝 Changelog

### v1.0.0 (2025-01-08)
- ✨ Implementazione iniziale straordinari automatici check-in
- ✨ Configurazione admin con toggle e tolleranza
- ✨ Blocco inserimento manuale per date con straordinari automatici
- ✨ Visualizzazione badge automatico/manuale nell'archivio
- ✨ Sistema di approvazione per straordinari automatici


