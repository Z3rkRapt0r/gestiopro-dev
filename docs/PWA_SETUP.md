# Progressive Web App (PWA) - Guida Completa

## Indice
1. [Panoramica](#panoramica)
2. [Funzionalità Implementate](#funzionalità-implementate)
3. [Setup Iniziale](#setup-iniziale)
4. [Configurazione VAPID per Push Notifications](#configurazione-vapid)
5. [Utilizzo](#utilizzo)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Panoramica

Gestiopro è ora una Progressive Web App (PWA) completa con supporto offline, notifiche push e installazione come app nativa.

### Vantaggi della PWA
- **Installabile**: Può essere installata come app nativa su dispositivi mobili e desktop
- **Offline First**: Funziona anche senza connessione internet
- **Push Notifications**: Notifiche in tempo reale per presenze e avvisi
- **Background Sync**: Le operazioni offline vengono sincronizzate automaticamente
- **Performance**: Caricamento più veloce grazie al caching intelligente

---

## Funzionalità Implementate

### 1. Service Worker con Caching Intelligente
- **NetworkFirst** per API Supabase (dati sempre aggiornati quando online)
- **CacheFirst** per Storage Supabase (documenti e immagini)
- **Precaching** per asset statici (JS, CSS, fonts)

### 2. Offline Queue System
Salva automaticamente le operazioni quando sei offline:
- ✅ Timbrature (check-in/check-out)
- ✅ Inserimento straordinari
- ✅ Richieste ferie/permessi
- ✅ Sincronizzazione automatica al ripristino della connessione

### 3. Push Notifications
Notifiche push per:
- Avvisi di presenza mancante
- Approvazione/rifiuto ferie e permessi
- Messaggi dall'amministratore
- Promemoria timbrature

### 4. UI Components
- **Indicatore Offline**: Mostra lo stato della connessione in tempo reale
- **Prompt di Installazione**: Invita gli utenti a installare l'app
- **Notifiche di Aggiornamento**: Avvisa quando è disponibile una nuova versione
- **Contatore Operazioni**: Visualizza quante operazioni sono in coda

---

## Setup Iniziale

### 1. Applicare la Migration per Push Notifications

```bash
npx supabase db push
```

Questo creerà la tabella `push_subscriptions` nel database.

### 2. Generare Icons PWA

Le icone PWA devono essere create nelle seguenti dimensioni:
- `public/pwa-192x192.png` (192x192 px)
- `public/pwa-512x512.png` (512x512 px)
- `public/apple-touch-icon.png` (180x180 px)
- `public/favicon.ico` (32x32 px)

Puoi usare strumenti online come:
- [PWA Asset Generator](https://www.pwabuilder.com/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

**Placeholder temporaneo:**
Per il momento, puoi usare il logo esistente ridimensionato:

```bash
# Installa imagemagick se non ce l'hai
brew install imagemagick  # MacOS
# oppure
sudo apt-get install imagemagick  # Linux

# Genera le icone (se hai un logo.png nella root)
convert logo.png -resize 192x192 public/pwa-192x192.png
convert logo.png -resize 512x512 public/pwa-512x512.png
convert logo.png -resize 180x180 public/apple-touch-icon.png
convert logo.png -resize 32x32 public/favicon.ico
```

---

## Configurazione VAPID

Per abilitare le notifiche push, devi generare chiavi VAPID (Voluntary Application Server Identification).

### 1. Generare Chiavi VAPID

```bash
npx web-push generate-vapid-keys
```

Output esempio:
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
Private Key: MUvSLT_t5hKFjEP3bJKaQsxVKW5pV5h9Hj6aQNrJkY4
```

### 2. Configurare le Chiavi

**Frontend (client-side):**
Aggiorna la VAPID public key in `src/components/pwa/NotificationSettings.tsx`:

```typescript
const VAPID_PUBLIC_KEY = 'LA_TUA_PUBLIC_KEY_QUI';
```

**Backend (Edge Function):**
Crea una nuova Edge Function per inviare notifiche push:

```typescript
// supabase/functions/send-push-notification/index.ts
import webpush from 'web-push';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
  const { subscription, notification } = await req.json();

  await webpush.sendNotification(subscription, JSON.stringify(notification));

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### 3. Configurare Secrets in Supabase

```bash
# Nel tuo progetto Supabase
npx supabase secrets set VAPID_PUBLIC_KEY="BEl62i..."
npx supabase secrets set VAPID_PRIVATE_KEY="MUvSLT..."
```

O via Dashboard:
1. Vai su **Settings → Functions**
2. Clicca su **Manage Secrets**
3. Aggiungi `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`

---

## Utilizzo

### Per Utenti Finali

#### Installare l'App
1. Apri Gestiopro nel browser
2. Vedrai un prompt di installazione in basso a sinistra
3. Clicca su "Installa"
4. L'app verrà aggiunta alla schermata home/desktop

#### Abilitare le Notifiche
1. Vai in **Impostazioni → Notifiche Push**
2. Attiva lo switch "Abilita Notifiche Push"
3. Concedi il permesso quando richiesto dal browser

#### Lavorare Offline
1. Se perdi la connessione, vedrai un badge "Offline" in alto a destra
2. Puoi continuare a timbrare e inserire dati normalmente
3. Le operazioni verranno salvate in una coda locale
4. Quando torni online, i dati verranno sincronizzati automaticamente
5. Riceverai una notifica quando la sincronizzazione è completata

### Per Amministratori

#### Monitorare le Sottoscrizioni Push
```sql
-- Query per vedere tutti gli utenti con notifiche attive
SELECT
    ps.id,
    p.first_name,
    p.last_name,
    p.email,
    ps.created_at as sottoscritto_il
FROM push_subscriptions ps
JOIN profiles p ON ps.user_id = p.id
ORDER BY ps.created_at DESC;
```

#### Inviare Notifiche Push Manualmente
```typescript
// Esempio chiamata Edge Function
const response = await fetch(
  'https://YOUR_PROJECT.supabase.co/functions/v1/send-push-notification',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: 'user-uuid',
      title: 'Promemoria',
      body: 'Non dimenticare di timbrare!',
      data: { type: 'attendance-reminder' }
    })
  }
);
```

---

## Testing

### Test Locale (Development)

```bash
# Avvia il dev server
npm run dev

# La PWA funziona anche in development mode grazie a devOptions
```

Apri Chrome DevTools:
1. **Application → Service Workers**: Verifica che il SW sia registrato
2. **Application → Manifest**: Verifica le info del manifest
3. **Application → Cache Storage**: Controlla le cache create
4. **Network → Throttling → Offline**: Testa la modalità offline

### Test Production

```bash
# Build per production
npm run build

# Servi la build localmente
npx serve dist

# Oppure
npx vite preview
```

### Test su Dispositivo Mobile

1. **Android Chrome:**
   - Apri `chrome://inspect#devices`
   - Collega il dispositivo via USB
   - Abilita debug USB

2. **iOS Safari:**
   - Vai su Impostazioni → Safari → Avanzate → Web Inspector
   - Connetti il device al Mac
   - Apri Safari → Sviluppo → [Tuo Device]

### Checklist Testing

- [ ] L'app si installa correttamente
- [ ] Le icone appaiono corrette nella schermata home
- [ ] Il service worker viene registrato
- [ ] Le notifiche funzionano (dopo aver concesso il permesso)
- [ ] La modalità offline funziona:
  - [ ] Timbratura check-in/out offline
  - [ ] Inserimento straordinari offline
  - [ ] Richieste ferie/permessi offline
  - [ ] Sincronizzazione automatica al ritorno online
- [ ] Gli aggiornamenti dell'app vengono notificati
- [ ] Il badge offline appare quando non c'è connessione
- [ ] Il contatore operazioni in coda è accurato

---

## Troubleshooting

### Service Worker non si registra

**Soluzione 1:** Verifica che l'app sia servita su HTTPS (o localhost)
```bash
# PWA funziona solo su HTTPS in production
# Usa un reverse proxy con SSL se servi localmente
```

**Soluzione 2:** Cancella la cache del browser e ricarica
```
Chrome: Ctrl+Shift+Delete → Cache → Svuota
```

**Soluzione 3:** Unregister SW esistenti
```javascript
// In DevTools Console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister());
});
```

### Notifiche non arrivano

**Problema 1:** Permesso negato
- Vai nelle impostazioni del browser
- Trova Gestiopro
- Abilita le notifiche manualmente

**Problema 2:** Sottoscrizione non salvata
```sql
-- Verifica nel database
SELECT * FROM push_subscriptions WHERE user_id = 'your-user-id';
```

**Problema 3:** VAPID keys non configurate
- Verifica che le chiavi siano nel file `NotificationSettings.tsx`
- Verifica i secrets in Supabase

### Operazioni offline non si sincronizzano

**Debug 1:** Verifica la coda
```javascript
// In DevTools Console
const queue = JSON.parse(localStorage.getItem('gestiopro_offline_queue'));
console.log(queue);
```

**Debug 2:** Trigger manuale della sincronizzazione
```javascript
// In DevTools Console
window.dispatchEvent(new CustomEvent('process-offline-queue'));
```

**Debug 3:** Verifica gli errori nella console
- Apri DevTools → Console
- Cerca errori durante la sincronizzazione

### Cache non si aggiorna

**Soluzione:** Forza l'aggiornamento del service worker
```javascript
// In DevTools Console
navigator.serviceWorker.getRegistration().then(reg => {
  reg.update();
});
```

---

## Risorse Utili

- [PWA Documentation - web.dev](https://web.dev/progressive-web-apps/)
- [Service Worker API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)

---

## Prossimi Passi

1. **Generare le icone PWA** con le dimensioni corrette
2. **Configurare le chiavi VAPID** per le notifiche push
3. **Creare l'Edge Function** per inviare notifiche
4. **Testare su dispositivi reali** (Android, iOS)
5. **Monitorare le metriche** (installazioni, notifiche inviate, operazioni offline)

---

Per domande o supporto, consulta la documentazione principale o apri una issue su GitHub.
