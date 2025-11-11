# 🚀 Piano Completo Migrazione Supabase Cloud → Self-Hosted

## 📊 STATO ATTUALE

✅ **Già fatto:**
- Database migrato (tabelle, RLS, dati)
- PostgreSQL funzionante sul VPS
- Supabase installato con Coolify
- pg_cron attivo

⚠️ **Da fare:**
- Edge Functions (16 totali)
- Supabase Auth (utenti da migrare)
- Supabase Storage (file da migrare)
- Aggiornare frontend per nuovi endpoint

---

## 🎯 RACCOMANDAZIONE FINALE

### Opzione 1: MIGRAZIONE COMPLETA (Consigliato se vuoi controllo totale)

**Tempo stimato**: 40-60 ore lavoro
**Difficoltà**: Alta
**Costo mensile**: ~€20-50 VPS (Hostinger)

**Vantaggi:**
- Controllo totale
- Nessun limite
- Costi prevedibili
- Privacy completa

**Svantaggi:**
- Tanto lavoro iniziale
- Devi gestire tutto tu
- Serve competenza DevOps
- Se si rompe qualcosa, devi fixarlo tu

---

### Opzione 2: MIGRAZIONE PARZIALE (Consigliato per la maggior parte dei casi)

**Tempo stimato**: 15-20 ore lavoro
**Difficoltà**: Media
**Costo mensile**: €20 VPS + €25 Supabase (Pro plan se serve)

**Cosa self-hostare:**
- ✅ Database (PostgreSQL) → sul VPS
- ✅ Auth (GoTrue) → sul VPS
- ✅ API Server Express → sul VPS
- ❌ Storage → usa Cloudflare R2 (€1-5/mese)
- ❌ Email → usa Resend (€20/mese per 100k email)

**Vantaggi:**
- Meno complessità
- Servizi gestiti per parti critiche (storage, email)
- Più affidabile
- Meno manutenzione

---

### Opzione 3: RESTA SU SUPABASE CLOUD (Da considerare!)

**Tempo stimato**: 0 ore
**Difficoltà**: Nessuna
**Costo mensile**: €25-100 (dipende dall'uso)

**Quando ha senso:**
- Non hai problemi di budget
- Il tuo prodotto genera già entrate
- Vuoi concentrarti sul business, non sull'infrastruttura
- Hai pochi utenti/dati (resti nel free tier o Pro)

**Supabase Pro Plan: $25/mese**
- 8GB database
- 100GB bandwidth
- 100GB storage
- Email support

Se il tuo progetto non supera questi limiti, è **conveniente restare su Cloud**.

---

## 📋 PIANO MIGRAZIONE COMPLETA (Step by Step)

### FASE 1: Preparazione (2-3 ore)

#### 1.1 Backup completo
```bash
# Backup database
pg_dump "$SUPABASE_CLOUD_URL" > backup_$(date +%Y%m%d).sql

# Backup storage (script automatico)
node scripts/backup-storage.js

# Backup auth users
node scripts/backup-users.js
```

#### 1.2 Setup ambiente locale testing
```bash
# Clona setup Supabase per test locale
git clone https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
docker-compose up -d
```

#### 1.3 Documenta tutto
- [ ] Lista di tutte le Edge Functions e cosa fanno
- [ ] Lista di tutti i bucket storage
- [ ] Lista di tutte le email template
- [ ] Credenziali e configurazioni

---

### FASE 2: Database e Auth (4-6 ore)

✅ **Database**: Già fatto!

#### 2.1 Configura Supabase Auth
```bash
# Nel tuo Coolify, configura variabili GoTrue:
GOTRUE_SITE_URL=https://app.tuodominio.com
GOTRUE_SMTP_HOST=smtp.resend.com
GOTRUE_SMTP_PORT=465
GOTRUE_SMTP_USER=resend
GOTRUE_SMTP_PASS=re_xxx
GOTRUE_JWT_SECRET=your-jwt-secret-32-chars-min
```

#### 2.2 Migra utenti
```bash
node scripts/migrate-users.js
```

#### 2.3 Testa login
```bash
# Prova login con utente test
# Verifica ricezione email
# Testa reset password
```

---

### FASE 3: Storage (6-8 ore)

#### Opzione A: MinIO (storage locale)
```bash
# In Coolify: aggiungi servizio MinIO
# Crea bucket: documents, logos, avatars
# Migra file con script
node scripts/migrate-storage-to-minio.js
```

#### Opzione B: Cloudflare R2 (raccomandato)
```bash
# Crea account Cloudflare
# Crea R2 bucket
# Ottieni access key
# Migra file
node scripts/migrate-storage-to-r2.js
```

#### 3.1 Aggiorna codice storage
```typescript
// src/lib/storage.ts
// Sostituisci supabase.storage con nuovo client
```

#### 3.2 Aggiorna URL nel database
```sql
-- Aggiorna URL dei file nel database
UPDATE documents
SET file_url = REPLACE(
  file_url,
  'https://nohufgceuqhkycsdffqj.supabase.co/storage',
  'https://storage.tuodominio.com'
);
```

---

### FASE 4: Edge Functions → API Server (20-30 ore) 🔥

Questa è la parte più lunga!

#### 4.1 Setup API Server
```bash
mkdir api-server
cd api-server
npm init -y
npm install express @supabase/supabase-js dotenv nodemailer compression sharp cors helmet
```

#### 4.2 Converti Edge Functions una per una

**Priorità Alta** (necessarie per funzionamento base):
1. `send-notification-email` → `/api/emails/send-notification`
2. `send-leave-request-email` → `/api/emails/send-leave-request`
3. `attendance-monitor` → `/api/attendance/monitor`
4. `create-employee` → `/api/employees/create`

**Priorità Media**:
5. `compress-document` → `/api/documents/compress`
6. `delete-document` → `/api/documents/delete`
7. `send-employee-message` → `/api/messages/send`
8. `check-missing-attendance` → `/api/attendance/check-missing`

**Priorità Bassa** (nice to have):
9. `notifications-cleanup` → Può rimanere come cron SQL
10. `auto-cleanup-employee` → Può rimanere come cron SQL
11. Altre funzioni di utilità

#### 4.3 Template conversione

**Per ogni Edge Function:**

1. Leggi la funzione Deno originale
2. Crea route Express equivalente
3. Testa localmente
4. Deploy su VPS
5. Aggiorna chiamata nel frontend
6. Testa in produzione
7. Verifica che la vecchia funzione non sia più chiamata

**Tempo per funzione**: 1.5-2 ore × 16 funzioni = 24-32 ore

---

### FASE 5: Frontend (4-6 ore)

#### 5.1 Aggiorna configurazione Supabase
```typescript
// src/integrations/supabase/client.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.tuodominio.com';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

#### 5.2 Sostituisci chiamate Edge Functions
```typescript
// PRIMA
await supabase.functions.invoke('send-notification-email', { body: data });

// DOPO
await fetch(`${API_URL}/api/emails/send-notification`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

#### 5.3 Test completo
- [ ] Login/Logout
- [ ] Upload documento
- [ ] Download documento
- [ ] Invio notifica
- [ ] Richiesta ferie
- [ ] Check-in presenze
- [ ] Ogni funzionalità del sistema

---

### FASE 6: Deploy e Monitoring (4-6 ore)

#### 6.1 Deploy su VPS
```bash
# In Coolify:
# 1. Aggiungi repository API Server
# 2. Configura variabili d'ambiente
# 3. Deploy automatico
```

#### 6.2 Setup reverse proxy
```nginx
# In Coolify, configura nginx per:
# - Frontend: https://app.tuodominio.com
# - API: https://api.tuodominio.com
# - Supabase: https://supabase.tuodominio.com
# - Storage: https://storage.tuodominio.com (se MinIO)
```

#### 6.3 Monitoring
```bash
# Installa in Coolify:
# - Uptime Kuma (monitoring uptime)
# - Grafana + Prometheus (metriche)
# - Loki (logs)
```

#### 6.4 Backup automatici
```bash
# Configura backup giornalieri:
# - Database → Backblaze B2
# - Storage → Backblaze B2
# - Configurazioni → Git

# Script cron per backup
0 2 * * * /scripts/backup-database.sh
0 3 * * * /scripts/backup-storage.sh
```

---

### FASE 7: Transizione Graduale (1-2 settimane)

#### 7.1 Soft Launch
1. Testa su ambiente di staging
2. Invita 2-3 utenti beta tester
3. Monitora errori per 2-3 giorni
4. Fix bug critici

#### 7.2 Migrazione utenti
1. Avvisa utenti della migrazione
2. Pianifica downtime (es. domenica notte)
3. Metti modalità manutenzione
4. Switch DNS/URL
5. Testa tutto
6. Rimuovi manutenzione

#### 7.3 Monitoraggio post-migrazione
- Prime 24h: monitoring continuo
- Prima settimana: check giornalieri
- Primo mese: check settimanali

---

## 💰 ANALISI COSTI

### Supabase Cloud (attuale)
```
Free Tier:
- 500MB database ✅
- 1GB storage ✅
- 2GB bandwidth ✅
- 50k monthly active users ✅
→ Costo: €0/mese

Se superi:
- Pro: €25/mese (8GB DB, 100GB storage, 100GB bandwidth)
- Team: €599/mese (unlimited)
```

### Self-Hosted (VPS)
```
Hostinger VPS:
- VPS 4: €14/mese (4GB RAM, 100GB SSD)
- VPS 8: €24/mese (8GB RAM, 200GB SSD) ⭐

Extra:
- Cloudflare R2 storage: €1-5/mese
- Resend email: €20/mese (o gratis per 3k/mese)
- Backblaze backup: €1-2/mese
- Dominio: €10/anno

→ Costo totale: €40-50/mese
```

### Quando conviene self-hosted?

**Self-hosted conviene se:**
- ✅ Hai >100 utenti attivi
- ✅ Usi >100GB bandwidth/mese
- ✅ Hai >10GB database
- ✅ Vuoi privacy completa
- ✅ Hai competenze tecniche

**Cloud conviene se:**
- ✅ Hai <100 utenti
- ✅ Stai ancora nel free tier
- ✅ Non hai tempo per DevOps
- ✅ Il prodotto non è ancora validato
- ✅ Vuoi concentrarti sul business

---

## ⚡ SOLUZIONE IBRIDA (BEST OF BOTH WORLDS)

Ecco la mia **raccomandazione migliore**:

### 1. Database: Self-Hosted ✅
- È già fatto
- Hai controllo completo
- Nessun costo extra

### 2. Auth: Self-Hosted ✅
- Incluso in Supabase self-hosted
- Funziona benissimo
- Zero problemi

### 3. Storage: Cloudflare R2 ✅
- €1-5/mese
- Download gratuiti illimitati
- CDN globale
- Zero sbattimenti

### 4. Edge Functions: API Server Express ✅
- Più semplice di Deno
- Più facile da debuggare
- Più flessibile

### 5. Email: Resend ✅
- 3,000 email/mese gratis
- Poi €20/mese
- Deliverability eccellente
- Zero configurazione

### 6. Cron: pg_cron ✅
- Già installato
- Già funzionante
- Zero problemi

**Costo totale: €25-35/mese**

---

## 🚦 DECISIONE: COSA FARE?

### ❓ FAI QUESTO TEST

Rispondi a queste domande:

1. **Il tuo prodotto genera entrate?**
   - NO → Resta su Supabase Cloud (free tier)
   - SÌ > €500/mese → Vai self-hosted
   - SÌ < €500/mese → Resta su Cloud (Pro €25/mese)

2. **Quanti utenti attivi hai?**
   - < 50 → Cloud
   - 50-500 → Valuta costi
   - > 500 → Self-hosted

3. **Hai competenze DevOps?**
   - NO → Cloud (non fare casino)
   - SÌ, basic → Soluzione ibrida
   - SÌ, esperto → Full self-hosted

4. **Quanto vale il tuo tempo?**
   - Tanto → Cloud (60h risparmiate = €3000+ valore)
   - Poco → Self-hosted

5. **Il progetto è mission-critical?**
   - SÌ → Cloud (SLA garantito, supporto 24/7)
   - NO → Self-hosted va bene

---

## 🎯 LA MIA RACCOMANDAZIONE PER TE

Basandomi sul tuo progetto (gestionale aziendale con presenze, ferie, documenti):

### SCENARIO A: Se è per clienti paganti
**→ Vai SOLUZIONE IBRIDA**
- Database + Auth: Self-hosted
- Storage: Cloudflare R2
- API: Express sul VPS
- Email: Resend

**Perché:** Costi sotto controllo, scalabile, flessibile.

### SCENARIO B: Se è un prodotto tuo in crescita
**→ Vai FULL SELF-HOSTED**
- Controllo totale
- Costi prevedibili
- Privacy completa

**Perché:** Vale l'investimento di tempo iniziale.

### SCENARIO C: Se è ancora in fase di test/beta
**→ RESTA SU CLOUD**
- Zero sbattimenti
- Concentrati sul prodotto
- Migra quando hai trazione reale

**Perché:** Il tempo speso in DevOps ora vale più delle entrate future incerte.

---

## 📞 PROSSIMI PASSI

**Dimmi:**

1. Il prodotto è già in produzione con clienti paganti?
2. Quanti utenti attivi hai?
3. Quanto storage/bandwidth usi al mese?
4. Hai già superato i limiti del free tier?
5. Quanto tempo puoi dedicare alla migrazione?

**In base alle risposte ti dirò esattamente cosa fare e posso aiutarti a:**
- Creare gli script di migrazione automatici
- Convertire le Edge Functions in API Express
- Setup completo del VPS
- Monitoring e backup

---

## 📚 RISORSE UTILI

- [Supabase Self-Hosting Docs](https://supabase.com/docs/guides/self-hosting)
- [Coolify Docs](https://coolify.io/docs)
- [MinIO Docs](https://min.io/docs/minio/linux/index.html)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [pg_cron Docs](https://github.com/citusdata/pg_cron)

Dimmi cosa vuoi fare e ti aiuto passo passo! 🚀
