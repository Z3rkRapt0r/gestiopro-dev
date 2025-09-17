# 🗄️ **CONFIGURAZIONE DATABASE DI SVILUPPO**

## 🎯 **Obiettivo**
Creare un database Supabase separato per lo sviluppo, in modo da poter testare nuove funzionalità senza rischiare di rompere il database di produzione.

## 📋 **PASSI PER CREARE IL DATABASE DI SVILUPPO**

### **1. 🔨 Crea Nuovo Progetto Supabase**
1. Vai su https://app.supabase.com/
2. Clicca **"New Project"**
3. Configura:
   - **Name**: `GestioPro - Development`
   - **Database Password**: Scegli una password sicura
   - **Region**: Europe (Frankfurt) - per consistenza con produzione
4. Attendi la creazione (5-10 minuti)

### **2. 📊 Clona lo Schema del Database**
Dopo aver creato il progetto di sviluppo, devi applicare lo stesso schema del database di produzione:

#### **Opzione A: Usa il Migration File (Raccomandato)**
```bash
# Nel tuo branch di sviluppo
supabase db push --file supabase/migrations/active/20250101000000_consolidated_database_schema.sql
```

#### **Opzione B: Usa il Dashboard Supabase**
1. Vai al SQL Editor del progetto di sviluppo
2. Copia e incolla il contenuto di:
   `supabase/migrations/active/20250101000000_consolidated_database_schema.sql`
3. Clicca **"Run"**

### **3. 🔧 Configura le Variabili d'Ambiente**

#### **Crea il file `.env.local`** (NON committare mai questo file!)
```bash
# Copia le variabili dal progetto di sviluppo
VITE_SUPABASE_DEV_URL=https://your-dev-project-ref.supabase.co
VITE_SUPABASE_DEV_ANON_KEY=your-dev-anon-key
```

#### **Come trovare l'URL e la chiave:**
1. Nel dashboard Supabase → Settings → API
2. Copia:
   - **Project URL** → `VITE_SUPABASE_DEV_URL`
   - **anon public** → `VITE_SUPABASE_DEV_ANON_KEY`

### **4. 🧪 Test della Configurazione**

#### **Test 1: Connessione Database**
```bash
# Nel tuo branch di sviluppo
npm run dev
```
- Apri il browser su `http://localhost:8080`
- Se vedi la pagina di login, la connessione funziona!

#### **Test 2: Verifica Ambiente**
Aggiungi temporaneamente questo codice per verificare quale database stai usando:
```javascript
console.log('Database URL:', import.meta.env.VITE_SUPABASE_DEV_URL || 'PRODUZIONE');
```

## 🔄 **WORKFLOW COMPLETO SVILUPPO**

### **Quando Sviluppi:**
```bash
# 1. Assicurati di essere nel branch feature
git checkout feature/nuova-funzionalita

# 2. Crea/modifica .env.local con le variabili DEV
# VITE_SUPABASE_DEV_URL=...
# VITE_SUPABASE_DEV_ANON_KEY=...

# 3. Avvia il server di sviluppo
npm run dev

# 4. Sviluppa e testa sul database di sviluppo
# ... modifiche al codice ...

# 5. Quando pronto, commit e push
git add .
git commit -m "feat: descrizione delle modifiche"
git push origin feature/nuova-funzionalita
```

### **Quando fai Merge:**
```bash
# Torna al main e merge
git checkout main
git merge feature/nuova-funzionalita

# Rimuovi .env.local prima del commit (per sicurezza)
rm .env.local

# Release automatico
npm run auto-release
```

## 🛡️ **SICUREZZA E BEST PRACTICES**

### **❌ Mai committare:**
- `.env.local`
- Chiavi API reali
- Password del database
- Dati sensibili

### **✅ Sempre verificare:**
- Stai usando il database giusto (DEV vs PROD)
- Le modifiche non rompono la produzione
- I dati di test sono appropriati

### **🔄 Ambiente Isolato:**
- **Produzione**: `main` branch → Database originale
- **Sviluppo**: `feature/*` branches → Database di sviluppo

## 🚨 **ATTENZIONE IMPORTANTE**

### **Prima di ogni merge nel main:**
1. **🧪 Testa su database di sviluppo**
2. **📋 Verifica che tutto funzioni**
3. **🗑️ Rimuovi .env.local**
4. **🔍 Controlla che non ci siano dati sensibili**

### **Se qualcosa va storto:**
```bash
# Torna indietro facilmente
git checkout main  # Torna alla versione stabile
git branch -D feature/nuova-funzionalita  # Elimina il branch problematico
```

## 🎯 **VANTAGGI DI QUESTO APPROCCIO**

- ✅ **🔒 Sicurezza**: Produzione sempre protetta
- ✅ **🧪 Testing**: Ambiente isolato per esperimenti
- ✅ **🚀 Velocità**: Sviluppo più rapido senza paura
- ✅ **🔄 Rollback**: Facile tornare indietro
- ✅ **👥 Team**: Più sviluppatori possono lavorare contemporaneamente

## 🎉 **PRONTO PER LO SVILUPPO SICURO!**

Ora puoi sviluppare senza paura di rompere il database di produzione! 🚀
