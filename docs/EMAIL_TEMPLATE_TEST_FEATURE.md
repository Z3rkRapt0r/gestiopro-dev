# 📧 Funzionalità Test Email Template

## Descrizione

È stato implementato un **pulsante "Invia Test"** per ogni template email che permette di inviare un'email di prova per verificare come appare il template con tutte le personalizzazioni applicate.

---

## 🎯 Cosa fa

Il pulsante "Invia Test" permette di:

1. **Inviare un'email di prova** a qualsiasi indirizzo email
2. **Vedere in anteprima** il template compilato con dati di esempio
3. **Verificare** colori, font, layout e stili personalizzati
4. **Testare** prima di salvare definitivamente il template

---

## 📍 Dove si trova

Il pulsante si trova in **ogni template editor**, accanto al pulsante "Salva Template":

```
Gestione Modelli Email
  ↓
Scegli categoria (Admin/Dipendente/Sistema)
  ↓
Scegli template specifico
  ↓
[Invia Test] [Salva Template]  ← QUI
```

---

## 🔧 Come usarlo

### Passo 1: Personalizza il template
1. Modifica l'oggetto dell'email
2. Personalizza il contenuto
3. Cambia colori, font, ecc.

### Passo 2: Clicca "Invia Test"
1. Si apre una finestra di dialogo
2. Inserisci l'indirizzo email destinatario
   - **Suggerimento**: Usa la tua email per vedere subito il risultato
3. Vedi anteprima dell'oggetto e contenuto
4. Clicca "Invia Test"

### Passo 3: Controlla la casella email
- L'oggetto avrà il prefisso `[TEST]`
- Il contenuto includerà dati di esempio
- Vedrai tutti gli stili applicati

---

## 📨 Dati di esempio inclusi

L'email di test include automaticamente dati fittizi per mostrare come apparirà con dati reali:

### Dati generali
- **Nome dipendente**: Mario Rossi (Test)
- **Email dipendente**: mario.rossi@example.com

### Template Alert Presenze
- **Data alert**: 15 Gennaio 2025
- **Ora alert**: 09:30
- **Ora prevista**: 08:00

### Template Ferie/Permessi
- **Tipo**: Ferie
- **Periodo**: 15-20 Gennaio 2025
- **Motivo**: Ferie invernali
- **Nota dipendente**: "Spero di poter approfittare di questi giorni per riposare."
- **Nota admin**: "Richiesta approvata. Buone vacanze!"

### Template Documenti
- **Nome documento**: Contratto_Lavoro_2025.pdf
- **Messaggio admin**: "Ho caricato il tuo contratto rinnovato. Controlla e firmalo entro il 31/01."

---

## ✅ Vantaggi

### Prima (senza test)
❌ Modifichi il template
❌ Salvi
❌ Invii email reale
❌ Ti accorgi che qualcosa non va
❌ Devi modificare e riprovare

### Ora (con test)
✅ Modifichi il template
✅ **Invii email di test**
✅ **Vedi subito come appare**
✅ Aggiusti se necessario
✅ Salvi quando sei soddisfatto
✅ Invii email reale con sicurezza

---

## 📋 Variabili disponibili per template

### Template Promemoria Presenza
Puoi usare queste variabili nel tuo template:

```
{employee_name}   → Mario Rossi
{alert_date}      → 15 Gennaio 2025
{alert_time}      → 09:30
{expected_time}   → 08:00
```

### Template Ferie/Permessi
```
{employee_name}   → Mario Rossi
{leave_details}   → Tipo, periodo, motivo
{employee_note}   → Nota del dipendente
{admin_note}      → Nota dell'amministratore
```

### Template Documenti
```
{employee_name}   → Mario Rossi
{document_name}   → Nome del file
{admin_message}   → Messaggio personalizzato admin
```

---

## 🎨 Esempio d'uso

### Scenario: Personalizzare Alert Presenze

1. **Vai a**: Gestione Modelli Email → Template Sistema → Promemoria Presenza

2. **Modifica contenuto**:
   ```
   Ciao {employee_name},

   Non hai ancora registrato l'entrata per oggi ({alert_date}).

   L'orario previsto era: {expected_time}
   Orario attuale: {alert_time}

   Per favore registra la tua presenza al più presto.
   ```

3. **Cambia colori**:
   - Colore primario: #ff6b6b (rosso)
   - Colore testo: #2c3e50 (blu scuro)

4. **Clicca "Invia Test"**:
   - Email: tua@email.com
   - Clicca "Invia Test"

5. **Controlla email**:
   - Oggetto: [TEST] Promemoria: Registrazione Entrata Mancante
   - Vedi il template con:
     - Nome: Mario Rossi (Test)
     - Data: 15 Gennaio 2025
     - Ora alert: 09:30
     - Ora prevista: 08:00
     - Colori applicati!

6. **Se ti piace**: Clicca "Salva Template"
   **Se vuoi modificare**: Aggiusta e ritesta

---

## ⚙️ Requisiti tecnici

### Per funzionare servono:
1. ✅ **Resend API Key configurata** in Impostazioni Admin
2. ✅ **Dominio verificato** in Resend (o usa onboarding@resend.dev per test)
3. ✅ **Connessione internet attiva**

### Se non funziona:
- Verifica che Resend API Key sia configurata
- Controlla che il dominio sia verificato in Resend
- Assicurati che l'email destinatario sia valida

---

## 🚀 Workflow consigliato

```
1. Crea nuovo template o modifica esistente
   ↓
2. Personalizza contenuto e design
   ↓
3. Clicca "Invia Test" → Controlla email
   ↓
4. Ti piace? → "Salva Template"
   Non ti piace? → Torna al passo 2
   ↓
5. Template salvato e pronto per uso reale!
```

---

## 📊 Comparazione

| Aspetto | Senza Test | Con Test |
|---------|-----------|----------|
| **Velocità verifica** | Lenta (devi inviare email reali) | Veloce (test immediato) |
| **Sicurezza** | Rischio errori in produzione | Testi prima in sicurezza |
| **Iterazioni** | Difficili e lente | Rapide e facili |
| **Confidence** | Bassa (non sai come appare) | Alta (vedi esattamente) |

---

## 💡 Tips & Tricks

### 1. Usa sempre la tua email
Inserisci la tua email personale per vedere subito il risultato nella tua casella di posta.

### 2. Testa su più client email
L'email potrebbe apparire diversa su:
- Gmail
- Outlook
- Apple Mail
- Client mobile

Invia test a tutte le email che usi!

### 3. Testa più volte
Non esitare a inviare più test mentre perfezioni il design. È gratis e immediato!

### 4. Verifica su mobile
Apri l'email di test anche sul telefono per verificare la visualizzazione mobile.

### 5. Controlla lo spam
La prima email di test potrebbe finire nello spam. Controlla anche lì!

---

## 🐛 Troubleshooting

### "Errore nell'invio dell'email di test"
**Causa**: Brevo API Key non configurata o non valida
**Soluzione**: Vai in Impostazioni Admin → Configura Brevo API Key

### "Email non arriva"
**Causa 1**: Email finita nello spam
**Soluzione**: Controlla cartella spam/junk

**Causa 2**: Email mittente non verificata in Brevo
**Soluzione**: Verifica l'email mittente nel dashboard Brevo

### "Il template appare male"
**Causa**: Alcuni client email non supportano tutti gli stili CSS
**Soluzione**: Usa stili semplici e testati (il sistema usa già template compatibili)

---

## 🎉 Benefici finali

✅ **Risparmio tempo**: Niente più email reali per testare
✅ **Più sicurezza**: Vedi esattamente cosa invii
✅ **Migliore qualità**: Puoi perfezionare facilmente
✅ **Meno errori**: Catturi problemi prima dell'invio
✅ **Più professionalità**: Template sempre perfetti

---

## 📝 Note importanti

1. L'email di test ha sempre `[TEST]` nell'oggetto
2. I dati sono tutti fittizi (Mario Rossi, date esempio, ecc.)
3. Il template salvato nel database viene usato come base
4. Gli stili personalizzati vengono applicati correttamente
5. Le variabili vengono sostituite con dati di esempio

---

## 🔗 Correlazioni

Questa funzionalità lavora con:
- **Gestione Template Email** (editor principale)
- **Configurazione Resend** (per invio email)
- **Edge Function send-test-email** (backend)
- **Sistema variabili template** (sostituzione dinamica)

---

Ora puoi testare ogni template prima di usarlo in produzione! 🚀
