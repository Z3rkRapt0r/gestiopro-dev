# Configurazione Database per Impostazioni Generali Applicazione

## Stato Attuale
L'applicazione è configurata per funzionare in modalità "locale" per le impostazioni generali. Le modifiche al titolo dell'applicazione vengono salvate temporaneamente ma non persistono dopo il refresh della pagina.

## Per Abilitare il Salvataggio Persistente

### 1. Avvia Docker Desktop
- Assicurati che Docker Desktop sia installato e in esecuzione
- Verifica che il servizio Docker sia attivo

### 2. Esegui la Migrazione del Database
```bash
# Dalla directory del progetto
npx supabase db reset
```

Questo comando:
- Avvia i servizi Supabase locali
- Esegue tutte le migrazioni, inclusa quella per `app_general_settings`
- Crea la tabella necessaria per salvare le impostazioni

### 3. Verifica la Migrazione
Dopo l'esecuzione, dovresti vedere:
- La tabella `app_general_settings` creata nel database
- Le impostazioni di default inserite per gli admin esistenti

### 4. Riattiva il Salvataggio nel Database
Una volta eseguita la migrazione, rimuovi i commenti TODO nel file `src/hooks/useAppGeneralSettings.tsx` e ripristina il codice originale per il salvataggio nel database.

## Struttura della Tabella
```sql
CREATE TABLE public.app_general_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_title TEXT NOT NULL DEFAULT 'SerramentiCorp - Gestione Aziendale',
  app_description TEXT DEFAULT 'Sistema di gestione aziendale per imprese di serramenti',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(admin_id)
);
```

## Note
- Le impostazioni sono specifiche per ogni amministratore
- Il titolo dell'applicazione viene aggiornato immediatamente anche in modalità locale
- Per un funzionamento completo, esegui la migrazione del database
