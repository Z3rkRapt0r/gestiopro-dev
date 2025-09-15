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

## Deploy

Il progetto è configurato per il deploy automatico su Vercel:

- **Produzione:** https://finestra-gestione-aziendale-1k51mpaua.vercel.app
- **GitHub:** https://github.com/Z3rkRapt0r/finestra-gestione-aziendale-pro

## Licenza

**SOFTWARE PROPRIETARIO - TUTTI I DIRITTI RISERVATI**

Questo software è di esclusiva proprietà di **License Global di Gabriele Giacomo Bellante**.

È vietato l'utilizzo, la copia, la distribuzione o la modifica del software senza l'espressa autorizzazione scritta del titolare.

Per informazioni dettagliate, consultare il file [LICENSE.md](LICENSE.md).

---

**© 2024 License Global di Gabriele Giacomo Bellante. Tutti i diritti riservati.**
