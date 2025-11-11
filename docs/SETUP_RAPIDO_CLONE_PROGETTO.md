# 🚀 Setup Rapido Dopo Clone Progetto

## 🎯 Obiettivo

Guida rapida per configurare il progetto dopo averlo clonato, **senza dover modificare file SQL o hardcode**.

---

## ⚡ Setup in 5 Minuti

### 1️⃣ Clona il Repository

```bash
git clone [url-repository]
cd finestra-gestione-aziendale-pro
npm install
```

### 2️⃣ Configura Supabase nel Database (Una Volta Sola)

Vai su **Supabase Dashboard → SQL Editor** ed esegui questi 2 script:

#### Script 1: Aggiungi colonne
```sql
ALTER TABLE public.admin_settings
ADD COLUMN IF NOT EXISTS supabase_url TEXT,
ADD COLUMN IF NOT EXISTS supabase_service_role_key TEXT;
```

#### Script 2: Aggiorna funzione
Copia e incolla tutto il contenuto di `sql/setup/update_attendance_monitor_function.sql`

### 3️⃣ Avvia l'Applicazione

```bash
npm run dev
```

### 4️⃣ Configura dall'Interfaccia Web

1. **Accedi come Admin**
2. Vai su **Impostazioni → Presenze**
3. Scorri fino a **"Configurazione Supabase"**
4. Inserisci:
   - **URL Progetto**: `https://tuo-progetto.supabase.co`
   - **Service Role Key**: `eyJ...` (dalla dashboard Supabase)
5. Clicca **"Salva Configurazione"**

### 5️⃣ Verifica

```sql
-- Nel SQL Editor di Supabase
SELECT public.attendance_monitor_cron();
```

Se vedi `"Email: ..."` nel risultato → **Funziona!** ✅

---

## 📋 Dove Trovare i Valori

### URL Progetto Supabase
1. Vai su **Supabase Dashboard**
2. Seleziona il tuo progetto
3. **Project Settings → API**
4. Copia **Project URL** (es: `https://xxx.supabase.co`)

### Service Role Key
1. Stessa pagina (**Project Settings → API**)
2. Copia **service_role** key (NON la anon key!)
3. Inizia con `eyJ...` ed è molto lunga

---

## ✅ Checklist

- [ ] Repository clonato
- [ ] `npm install` eseguito
- [ ] Script 1 eseguito (aggiungi colonne)
- [ ] Script 2 eseguito (aggiorna funzione)
- [ ] Applicazione avviata
- [ ] Login come admin
- [ ] Configurazione Supabase compilata
- [ ] Configurazione salvata
- [ ] Test manuale riuscito

---

## 🎉 Fatto!

Ora il sistema è configurato e il monitoraggio presenze funziona automaticamente!

**Vantaggi**:
- ✅ Zero hardcode nel codice
- ✅ Configurazione dall'interfaccia web
- ✅ Portabile su qualsiasi ambiente
- ✅ Modificabile in qualsiasi momento

---

## 📚 Documentazione Completa

Per maggiori dettagli, consulta:
- `docs/CONFIGURAZIONE_SUPABASE_UI.md` - Guida completa configurazione UI
- `docs/RIMUOVI_HARDCODE_ATTENDANCE.md` - Dettagli tecnici
- `docs/ATTENDANCE_MONITORING_SUPABASE_ONLY.md` - Architettura sistema

---

## 🆘 Problemi?

### La sezione non appare nell'UI
Verifica di aver eseguito lo Script 1 (aggiungi colonne)

### Errore "Configurazione non trovata"
Compila i campi in Impostazioni → Presenze → Configurazione Supabase

### Gli avvisi non arrivano
1. Verifica configurazione salvata
2. Testa: `SELECT public.attendance_monitor_cron();`
3. Controlla log cron: `SELECT * FROM cron.job_run_details ...`

---

**Buon lavoro!** 🚀


