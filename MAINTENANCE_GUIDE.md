# Guida Gestione Manutenzione e Abbonamenti

## Panoramica

Il sistema di manutenzione è gestito tramite **Vercel Edge Config** e può mostrare diversi tipi di messaggi:

1. **Manutenzione generale** - Sistema temporaneamente non disponibile
2. **Abbonamento scaduto** - Accesso limitato per scadenza abbonamento
3. **Messaggi personalizzati** - Pagine HTML custom

## Configurazione tramite Vercel Edge Config

### Variabili disponibili:

- `maintenance` (boolean) - Attiva/disattiva modalità manutenzione
- `maintenance-config` (boolean) - Alias per maintenance
- `subscription-expired` (boolean) - Attiva modalità abbonamento scaduto
- `subscription_expired` (boolean) - Alias per subscription-expired
- `maintenance-message-type` (string) - Tipo di messaggio da mostrare
- `message_type` (string) - Alias per maintenance-message-type

### Valori per `maintenance-message-type`:

- `default` - Pagina manutenzione standard
- `subscription` - Pagina abbonamento scaduto
- `custom` - Pagina personalizzata (attualmente usa maintenance.html)

## Configurazione tramite Variabili d'Ambiente

### Vercel Dashboard → Settings → Environment Variables:

```
MAINTENANCE_MODE=true|false
SUBSCRIPTION_EXPIRED=true|false
```

## Configurazione tramite Header HTTP (per test)

```
x-force-maintenance: 1|true
x-force-subscription-expired: 1|true
```

## Come attivare/disattivare

### Metodo 1: Vercel CLI (Raccomandato)

```bash
# Attiva manutenzione
npx vercel env add MAINTENANCE_MODE production
# Inserisci: true

# Attiva abbonamento scaduto
npx vercel env add SUBSCRIPTION_EXPIRED production
# Inserisci: true

# Disattiva manutenzione
npx vercel env rm MAINTENANCE_MODE production

# Disattiva abbonamento scaduto
npx vercel env rm SUBSCRIPTION_EXPIRED production
```

### Metodo 2: Vercel Dashboard

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto
3. Settings → Environment Variables
4. Aggiungi/modifica le variabili:
   - `MAINTENANCE_MODE` = `true` (per manutenzione)
   - `SUBSCRIPTION_EXPIRED` = `true` (per abbonamento scaduto)

### Metodo 3: Edge Config (se configurato)

```bash
# Installa Vercel CLI se non già installato
npm i -g vercel

# Configura Edge Config
vercel edge-config create maintenance-config

# Aggiungi variabili
vercel edge-config set maintenance-config maintenance true
vercel edge-config set maintenance-config subscription-expired true
vercel edge-config set maintenance-config maintenance-message-type subscription
```

## Pagine disponibili

### `/maintenance.html`
- Pagina di manutenzione generale
- Design moderno con animazioni
- Auto-refresh ogni 30 secondi
- Informazioni di contatto

### `/subscription-expired.html`
- Pagina per abbonamento scaduto
- Call-to-action per rinnovo
- Lista funzionalità non disponibili
- Contatti per supporto

## Personalizzazione

### Modificare le pagine esistenti

1. Modifica `public/maintenance.html` per la manutenzione generale
2. Modifica `public/subscription-expired.html` per l'abbonamento scaduto

### Creare nuove pagine

1. Crea un nuovo file HTML in `public/`
2. Modifica `api/maintenance-guard-advanced.ts` per aggiungere il nuovo tipo
3. Aggiorna la logica di routing

### Esempio: Pagina personalizzata

```typescript
// In api/maintenance-guard-advanced.ts
switch (messageType) {
  case 'custom':
    return fetch(new URL('/custom-page.html', request.url));
  // ... altri casi
}
```

## Test

### Test locale

```bash
# Simula manutenzione
curl -H "x-force-maintenance: 1" http://localhost:3000

# Simula abbonamento scaduto
curl -H "x-force-subscription-expired: 1" http://localhost:3000
```

### Test produzione

```bash
# Attiva manutenzione temporanea
npx vercel env add MAINTENANCE_MODE production
# Inserisci: true

# Testa l'URL
curl https://tu-app.vercel.app

# Disattiva
npx vercel env rm MAINTENANCE_MODE production
```

## Monitoraggio

I log di Vercel mostreranno:
```
[maintenance-guard] maintenance = true
[maintenance-guard] subscriptionExpired = false
[maintenance-guard] messageType = default
```

## Sicurezza

- Le pagine di manutenzione sono statiche e sicure
- Non espongono informazioni sensibili
- Headers appropriati per cache e sicurezza
- Rate limiting automatico di Vercel

## Troubleshooting

### La manutenzione non si attiva
1. Verifica le variabili d'ambiente in Vercel Dashboard
2. Controlla i log di Vercel per errori
3. Testa con header HTTP per debug

### La pagina non si carica
1. Verifica che i file HTML siano in `public/`
2. Controlla che il routing in `vercel.json` sia corretto
3. Verifica i permessi dei file

### Cache issues
1. Le pagine hanno header `Cache-Control: no-store`
2. Vercel Edge Config ha TTL di 60 secondi
3. Per cambiamenti immediati, usa variabili d'ambiente
