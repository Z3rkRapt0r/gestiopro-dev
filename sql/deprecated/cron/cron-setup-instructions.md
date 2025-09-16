# Configurazione Cron Job per Controllo Entrate Automatico

Il sistema di controllo entrate automatico richiede l'esecuzione della funzione Edge `check-missing-attendance` ogni 15 minuti.

## Opzioni di Configurazione

### 1. GitHub Actions (Raccomandato)

Crea il file `.github/workflows/check-attendance.yml`:

```yaml
name: Check Missing Attendance
on:
  schedule:
    - cron: '*/15 * * * *'  # Ogni 15 minuti
  workflow_dispatch:  # Permette esecuzione manuale

jobs:
  check-attendance:
    runs-on: ubuntu-latest
    steps:
      - name: Call attendance check function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            "${{ secrets.SUPABASE_URL }}/functions/v1/check-missing-attendance"
```

**Secrets da configurare in GitHub:**
- `SUPABASE_URL`: URL del tuo progetto Supabase
- `SUPABASE_ANON_KEY`: Chiave anonima di Supabase

### 2. Vercel Cron Jobs

Se usi Vercel Pro, puoi configurare un cron job in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/check-attendance",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Poi crea `pages/api/check-attendance.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/check-missing-attendance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error calling attendance check:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 3. Servizio Esterno (cron-job.org)

1. Vai su [cron-job.org](https://cron-job.org)
2. Crea un account gratuito
3. Configura un nuovo cron job:
   - **URL**: `https://your-supabase-project.supabase.co/functions/v1/check-missing-attendance`
   - **Schedule**: `*/15 * * * *` (ogni 15 minuti)
   - **Method**: POST
   - **Headers**: 
     - `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
     - `Content-Type: application/json`

### 4. Server Linux (crontab)

Se hai un server Linux, aggiungi al crontab:

```bash
# Apri crontab
crontab -e

# Aggiungi questa riga
*/15 * * * * curl -X POST -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" -H "Content-Type: application/json" "https://your-supabase-project.supabase.co/functions/v1/check-missing-attendance"
```

## Test della Funzione

Per testare manualmente la funzione:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "https://your-supabase-project.supabase.co/functions/v1/check-missing-attendance"
```

## Monitoraggio

La funzione restituisce un JSON con i risultati:

```json
{
  "success": true,
  "results": [
    {
      "admin_id": "uuid",
      "employee_id": "uuid", 
      "employee_name": "Nome Dipendente",
      "status": "sent"
    }
  ],
  "processedAt": "2024-01-01T10:00:00.000Z"
}
```

## Note Importanti

- La funzione viene eseguita solo se l'amministratore ha abilitato il controllo automatico
- Gli avvisi vengono inviati solo nei giorni lavorativi
- Non vengono inviati avvisi se il dipendente è in ferie o permesso
- Viene inviato massimo un avviso per dipendente per giorno
- L'orario di attesa è configurabile dall'amministratore (default: 30 minuti dopo l'orario previsto)
