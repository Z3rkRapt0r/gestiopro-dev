# Migrazione Supabase Auth

## Situazione

Supabase Self-Hosted **INCLUDE** Supabase Auth (GoTrue)!
È uno dei componenti che funziona meglio in self-hosted.

---

## ✅ SOLUZIONE: Usa Supabase Auth Self-Hosted (CONSIGLIATO)

### Perché funziona bene

- GoTrue (Supabase Auth) è incluso nel self-hosted
- Funziona esattamente come su Cloud
- Stesso codice, stesse API
- Gestisce JWT, session, refresh token automaticamente

### Setup

1. **Supabase Auth è già installato nel tuo VPS**
   Se hai installato Supabase con Coolify, GoTrue è già attivo.

2. **Configura le variabili**
```bash
# Nel tuo .env di Supabase
GOTRUE_SITE_URL=https://tuodominio.com
GOTRUE_MAILER_AUTOCONFIRM=false
GOTRUE_SMTP_HOST=smtp.resend.com
GOTRUE_SMTP_PORT=465
GOTRUE_SMTP_USER=resend
GOTRUE_SMTP_PASS=your_resend_api_key
GOTRUE_SMTP_SENDER_NAME="GestioPro"
```

3. **Il frontend non cambia**
```typescript
// Funziona uguale!
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://tuovps.com',  // Cambia solo l'URL
  'your_anon_key'
)

// Login esattamente come prima
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})
```

### Migrare gli utenti esistenti

```javascript
// Script di migrazione utenti da Cloud a Self-Hosted
import { createClient } from '@supabase/supabase-js';

// Cloud (source)
const supabaseCloud = createClient(
  'https://nohufgceuqhkycsdffqj.supabase.co',
  'your_service_role_key'
);

// Self-hosted (destination)
const supabaseSelfHost = createClient(
  'https://tuovps.com',
  'your_service_role_key'
);

async function migrateUsers() {
  // 1. Esporta utenti da Cloud
  const { data: users } = await supabaseCloud.auth.admin.listUsers();

  // 2. Importa in Self-Hosted
  for (const user of users.users) {
    // Crea utente in self-hosted
    const { data: newUser, error } = await supabaseSelfHost.auth.admin.createUser({
      email: user.email,
      email_confirm: true,  // Email già verificata
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata
    });

    if (error) {
      console.error(`Failed to migrate ${user.email}:`, error);
    } else {
      console.log(`Migrated ${user.email}`);

      // Copia dati profilo
      await supabaseSelfHost
        .from('profiles')
        .update({
          ...profileData
        })
        .eq('id', newUser.user.id);
    }
  }
}

migrateUsers();
```

---

## ⚠️ OPZIONE B: Auth Personalizzata (Non consigliato)

Se **davvero** volessi sostituire Supabase Auth:

### Con NextAuth.js / Auth.js
```bash
npm install next-auth
```

**PRO:**
- Flessibile, supporta molti provider
- Ben documentato

**CONTRO:**
- Devi riscrivere tutto il codice auth del frontend
- Devi migrare tutti gli utenti
- Devi gestire JWT manualmente
- Molto lavoro per nessun vantaggio reale

### Con Passport.js
```bash
npm install passport passport-local
```

**CONTRO:**
- Ancora più lavoro
- Devi implementare tutto manualmente

---

## 🎯 RACCOMANDAZIONE

**USA SUPABASE AUTH SELF-HOSTED**

È incluso, funziona bene, non devi cambiare codice.

L'unica cosa che devi fare:
1. Configurare SMTP per email (Resend, SendGrid, etc.)
2. Migrare gli utenti con lo script sopra
3. Cambiare l'URL nel frontend

Fine. Zero problemi.

---

## Checklist Migrazione Auth

- [ ] Configura GoTrue nel self-hosted
- [ ] Imposta SMTP per email di conferma/reset password
- [ ] Esporta utenti da Cloud
- [ ] Importa utenti in Self-Hosted con lo script
- [ ] Verifica che gli utenti possano fare login
- [ ] Testa reset password
- [ ] Testa email di conferma
- [ ] Aggiorna URL nel frontend
- [ ] Testa tutto il flusso auth

**Tempo stimato**: 2-3 ore
