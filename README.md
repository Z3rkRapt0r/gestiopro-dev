# GestioPro - Sistema di Gestione Aziendale

**Software proprietario di gestione aziendale professionale**

---

## Informazioni Aziendali

**License Global di Gabriele Giacomo Bellante**
- **P.IVA:** IT07073180825
- **Indirizzo:** Via Oreste Arena, 10 - 90142 Palermo (PA)
- **Email:** info@licenseglobal.it
- **Telefono:** +39 3270493679

---

## Descrizione del Progetto

GestioPro è un sistema completo di gestione aziendale sviluppato per semplificare e automatizzare i processi aziendali. Il software include funzionalità avanzate per:

- **Gestione dipendenti** - Anagrafica completa e tracking
- **Presenze e orari** - Controllo accessi e gestione orari di lavoro
- **Ferie e permessi** - Gestione completa delle richieste di assenza
- **Straordinari** - Tracking e gestione delle ore extra
- **Documenti** - Gestione centralizzata della documentazione
- **Dashboard amministrativa** - Panoramica completa delle attività aziendali
- **Notifiche** - Sistema di comunicazione integrato

## Tecnologie Utilizzate

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI Framework:** shadcn-ui + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Autenticazione:** Supabase Auth
- **Deploy:** Vercel

## Installazione e Sviluppo

### Prerequisiti
- Node.js 18+ ([installare con nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm o yarn
- Accesso al database Supabase

### Setup Locale

```bash
# 1. Clonare il repository
git clone https://github.com/Z3rkRapt0r/finestra-gestione-aziendale-pro.git

# 2. Navigare nella directory del progetto
cd finestra-gestione-aziendale-pro

# 3. Installare le dipendenze
npm install

# 4. Configurare le variabili d'ambiente
cp .env.example .env.local
# Modificare .env.local con le proprie credenziali Supabase

# 5. Avviare il server di sviluppo
npm run dev
```

### Script Disponibili

- `npm run dev` - Avvia il server di sviluppo
- `npm run build` - Build di produzione
- `npm run preview` - Anteprima del build di produzione
- `npm run lint` - Controllo del codice

## ⚙️ Configurazione Avanzata

### Database Setup
Per abilitare il salvataggio persistente delle impostazioni:

1. **Avvia Docker Desktop** e assicurati che sia attivo
2. **Esegui la migrazione**: `npx supabase db reset`
3. **Verifica**: Le impostazioni verranno salvate nel database

### Primo Accesso Utente
Sistema di cambio password obbligatorio al primo login:
- ✅ **Solo al primo accesso** - Successivamente accesso normale
- ✅ **Scelta utente** - Mantenere password attuale o cambiarla
- ✅ **Validazioni sicurezza** - Minimo 6 caratteri
- ✅ **User-friendly** - Interfaccia coerente

**Setup**: Eseguire gli script SQL in `sql/data/update_email_templates.sql`

## Deploy

Il progetto è configurato per il deploy automatico su Vercel:

- **Produzione:** https://finestra-gestione-aziendale-1k51mpaua.vercel.app
- **GitHub:** https://github.com/Z3rkRapt0r/finestra-gestione-aziendale-pro

## 📁 Struttura File Organizzata

```
sql/
├── README.md           # 📖 Guida organizzazione
├── cron/
│   └── cron_master.sql # 🚀 Configurazioni cron unificate
├── data/               # 📅 Dati iniziali
├── fixes/
│   └── fixes_master.sql # 🔧 Soluzioni problemi unificate
├── tests/              # 🧪 Test e diagnostica
└── deprecated/         # 🗂️ File archiviati (21 file)

scripts/
└── version-manager.js  # 🏷️ Gestore versioni automatico

docs/
├── DATABASE_SETUP.md   # 🗄️ Setup database avanzato
└── FIRST_LOGIN_SETUP.md # 🔐 Configurazione primo accesso

CHANGELOG.md           # 📋 Storia versioni completa
VERSION                # 🏷️ Versione corrente
```

## 🏷️ Versioning e Rilasci

### Versione Corrente
**GestioPro v2.6.0** - Ottimizzazione completa e organizzazione file

### Sistema di Versioning
Utilizziamo [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH):

- **MAJOR**: Cambiamenti breaking / rebranding importante
- **MINOR**: Nuove funzionalità significative
- **PATCH**: Bug fix e miglioramenti minori

### 🚀 Sistema di Auto-Release (Raccomandato)

```bash
# RILASCIO AUTOMATICO - Analizza i commit e determina automaticamente la versione
npm run auto-release

# Mostra aiuto per il sistema di auto-release
npm run release:help
```

**Cosa fa automaticamente:**
- 🔍 **Analizza gli ultimi 20 commit** per determinare il tipo di versione
- 📝 **Genera automaticamente** le voci del CHANGELOG
- 📦 **Aggiorna VERSION e package.json**
- 📚 **Aggiorna README.md** con la nuova versione
- 🏷️ **Crea tag Git** appropriato
- 📋 **Documenta tutto** nel CHANGELOG

### Metodi Manuali Alternativi

```bash
# Per nuove funzionalità (minor)
npm run version:minor
node scripts/version-manager.js minor "Aggiunto sistema notifiche push"

# Per bug fix (patch)
npm run version:patch
node scripts/version-manager.js patch "Corretto bug validazione form"

# Per cambiamenti breaking (major)
npm run version:major
node scripts/version-manager.js major "Ristrutturazione completa API"
```

### Rilascio Tradizionale
```bash
# Build, version, tag e push manuale
npm run release
```

### Documentazione Versioni
- **CHANGELOG.md**: Storia completa di tutte le versioni
- **VERSION**: File contenente la versione corrente
- **Git Tags**: Ogni versione ha il suo tag (v2.1.0, v2.0.0, etc.)

## 📋 Changelog Recente

### v2.1.0 (2025-09-16)
- 🔧 **Ottimizzazione completa** dei file SQL (138→60 file)
- 📁 **Riorganizzazione** in cartelle logiche
- 📚 **Documentazione consolidata** e migliorata
- ⚙️ **Configurazioni TypeScript** ottimizzate

### v2.0.0 (2025-09-16)
- 🚀 **Rebranding completo** a GestioPro
- 📧 **Sistema controllo entrate automatico**
- 🎨 **Miglioramenti UI/UX** significativi

*Vedi [CHANGELOG.md](CHANGELOG.md) per la storia completa*

## 🤝 Contributi e Sviluppo

### Per Sviluppatori
1. **Prima di commit importanti**: Usa il version manager
2. **Aggiorna CHANGELOG.md**: Documenta le tue modifiche
3. **Testa le modifiche**: Assicurati che tutto funzioni
4. **Crea versioni appropriate**: Usa semantic versioning

### 🔄 Workflow di Rilascio (Nuovo Sistema Automatico)

#### **Opzione 1: Auto-Release (Raccomandato)**
```bash
# Dopo aver completato le modifiche e fatto commit
npm run auto-release

# Questo fa tutto automaticamente:
# ✅ Analizza commit → Determina versione → Aggiorna file → Crea tag
```

#### **Opzione 2: Rilascio Manuale**
1. **Sviluppo**: Implementa le feature
2. **Test**: Verifica che tutto funzioni
3. **Version**: `npm run version:minor/patch/major`
4. **Deploy**: `npm run release` (build + tag + push)

#### **Opzione 3: Rilascio Guidato**
```bash
# Per aiuto e opzioni
npm run release:help
```

## Licenza

**SOFTWARE PROPRIETARIO - TUTTI I DIRITTI RISERVATI**

Questo software è di esclusiva proprietà di **License Global di Gabriele Giacomo Bellante**.

È vietato l'utilizzo, la copia, la distribuzione o la modifica del software senza l'espressa autorizzazione scritta del titolare.

Per informazioni dettagliate, consultare il file [LICENSE.md](LICENSE.md).

---

**© 2024 License Global di Gabriele Giacomo Bellante. Tutti i diritti riservati.**
