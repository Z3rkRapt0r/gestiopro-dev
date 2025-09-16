# 🚀 Guida al Rilascio - GestioPro

Questa guida spiega come creare e gestire i rilasci di nuove versioni di GestioPro.

## 📋 Prerequisiti

- **Git configurato** correttamente
- **Node.js e npm** installati
- **Accesso al repository** GitHub
- **Permessi di push** sul branch principale

## 🎯 Tipi di Rilascio

### 🔧 Patch Release (x.x.PATCH)
Per **bug fix** e **miglioramenti minori**:
```bash
node scripts/version-manager.js patch "Corretto bug validazione form"
# oppure
npm run version:patch
```

### ✨ Minor Release (x.MINOR.x)
Per **nuove funzionalità** che non rompono la compatibilità:
```bash
node scripts/version-manager.js minor "Aggiunto sistema notifiche push"
# oppure
npm run version:minor
```

### 🚨 Major Release (MAJOR.x.x)
Per **cambiamenti breaking** o **ristrutturazioni importanti**:
```bash
node scripts/version-manager.js major "Ristrutturazione completa API"
# oppure
npm run version:major
```

## 📝 Workflow Completo di Rilascio

### 1. Preparazione
```bash
# Assicurati di essere sul branch principale
git checkout main
git pull origin main

# Verifica che tutto funzioni
npm run build
npm run lint
npm test  # se hai test
```

### 2. Aggiornamento Versione
```bash
# Crea nuova versione con descrizione
node scripts/version-manager.js minor "Sistema notifiche push implementato"

# Questo automaticamente:
# ✅ Aggiorna VERSION
# ✅ Aggiorna package.json
# ✅ Aggiorna CHANGELOG.md
# ✅ Crea commit git
# ✅ Crea tag git
```

### 3. Verifica Modifiche
```bash
# Controlla cosa è stato modificato
git log --oneline -5
git tag --list | tail -5

# Verifica versione corrente
cat VERSION
```

### 4. Deploy e Pubblicazione
```bash
# Push delle modifiche e tag
git push origin main
git push origin --tags

# Il deploy automatico su Vercel partirà
# Verifica su: https://vercel.com/dashboard
```

### 5. Post-Rilascio
```bash
# Crea release su GitHub (opzionale)
# Vai su: https://github.com/tuo-repo/releases/new
# Tag: v2.1.0
# Titolo: GestioPro v2.1.0 - Sistema notifiche push
# Descrizione: Copia dal CHANGELOG.md
```

## 🏷️ Version Manager Dettagliato

### Comandi Disponibili

```bash
# Rilascio automatico completo
npm run release

# Versioni specifiche
npm run version:patch   # 1.0.0 → 1.0.1
npm run version:minor   # 1.0.0 → 1.1.0
npm run version:major   # 1.0.0 → 2.0.0

# Version manager avanzato
node scripts/version-manager.js patch "Fix descrizione"
node scripts/version-manager.js minor "Feature descrizione"
node scripts/version-manager.js major "Breaking change descrizione"
```

### Cosa Fa il Version Manager

Quando esegui `node scripts/version-manager.js minor "Nuova feature"`:

1. **Analizza versione corrente** da `VERSION`
2. **Calcola nuova versione** (es: 2.0.0 → 2.1.0)
3. **Aggiorna file**:
   - `VERSION` → nuova versione
   - `package.json` → aggiorna version field
   - `CHANGELOG.md` → aggiunge nuova sezione
4. **Git operations**:
   - `git add .`
   - `git commit -m "feat: release version 2.1.0"`
   - `git tag v2.1.0`

## 📋 Controllo Qualità Pre-Rilascio

### ✅ Checklist Tecnica
- [ ] `npm run build` completato senza errori
- [ ] `npm run lint` senza warning critici
- [ ] Test passati (se presenti)
- [ ] Database migrations testate
- [ ] Edge Functions funzionanti

### ✅ Checklist Funzionale
- [ ] Login amministratore funziona
- [ ] Login dipendente funziona
- [ ] Registrazione presenze funziona
- [ ] Richieste ferie funzionano
- [ ] Sistema notifiche funziona

### ✅ Checklist Documentazione
- [ ] CHANGELOG.md aggiornato
- [ ] README.md aggiornato se necessario
- [ ] Nuove feature documentate
- [ ] API changes documentate

## 🔄 Rollback (se necessario)

Se qualcosa va storto dopo il rilascio:

```bash
# Torna alla versione precedente
git checkout v2.0.0  # versione precedente
git tag -d v2.1.0    # rimuovi tag errato
npm run version:patch  # o il tipo appropriato per fix
```

## 📊 Monitoraggio Post-Rilascio

### Metriche da Monitorare
- **Error logs** dell'applicazione
- **Database performance**
- **User feedback**
- **Sistema notifiche** (se implementato)

### Contatti di Supporto
- **Email**: info@licenseglobal.it
- **Telefono**: +39 3270493679
- **Documentazione**: [CHANGELOG.md](CHANGELOG.md)

## 🎯 Esempi Pratici

### Rilascio Patch (Bug Fix)
```bash
node scripts/version-manager.js patch "Corretto calcolo ore ferie in mesi bisestili"
# Risultato: v2.1.0 → v2.1.1
```

### Rilascio Minor (Nuova Feature)
```bash
node scripts/version-manager.js minor "Implementato sistema esportazione PDF presenze"
# Risultato: v2.1.0 → v2.2.0
```

### Rilascio Major (Breaking Change)
```bash
node scripts/version-manager.js major "Migrazione a nuova architettura API"
# Risultato: v2.1.0 → v3.0.0
```

---

**Ricorda**: Ogni rilascio importante dovrebbe migliorare l'esperienza utente e mantenere la stabilità del sistema! 🎉
