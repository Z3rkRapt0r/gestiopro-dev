# Conversione Edge Functions in API REST

## Perché convertire

Le Edge Functions di Supabase su self-hosted sono complesse da configurare:
- Richiedono Deno runtime
- Setup complicato con Docker
- Debugging difficile
- Dipendenze non standard

**Soluzione**: Convertirle in un server Node.js Express che gira nello stesso VPS.

---

## Setup API Server

### 1. Crea cartella API
```bash
mkdir api-server
cd api-server
npm init -y
npm install express @supabase/supabase-js dotenv nodemailer compression sharp
```

### 2. Struttura
```
api-server/
├── src/
│   ├── routes/
│   │   ├── attendance.js       # attendance-monitor, check-missing-attendance
│   │   ├── documents.js        # compress-document, delete-document
│   │   ├── employees.js        # create-employee, auto-cleanup-employee
│   │   ├── emails.js          # send-*-email functions
│   │   ├── notifications.js    # notifications-cleanup, send-employee-message
│   │   └── users.js           # delete-user-completely
│   ├── services/
│   │   ├── email.service.js    # Logica invio email
│   │   ├── attendance.service.js
│   │   └── document.service.js
│   ├── middleware/
│   │   └── auth.js            # Verifica JWT token
│   └── index.js
├── .env
└── package.json
```

### 3. File principale (src/index.js)
```javascript
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Supabase client (self-hosted)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Import routes
import attendanceRoutes from './routes/attendance.js';
import documentsRoutes from './routes/documents.js';
import employeesRoutes from './routes/employees.js';
import emailsRoutes from './routes/emails.js';
import notificationsRoutes from './routes/notifications.js';

// Use routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/emails', emailsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
```

---

## Esempio: Conversione send-notification-email

### PRIMA (Edge Function Deno)
```typescript
// supabase/functions/send-notification-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { notificationId } = await req.json()

  // ... logica invio email

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
```

### DOPO (API Express Node.js)
```javascript
// api-server/src/routes/emails.js
import express from 'express';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configura Resend (o altro provider)
const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: {
    user: 'resend',
    pass: process.env.RESEND_API_KEY
  }
});

router.post('/send-notification', async (req, res) => {
  try {
    const { notificationId } = req.body;

    // Recupera notifica dal database
    const { data: notification } = await supabase
      .from('notifications')
      .select('*, recipient:profiles(*)')
      .eq('id', notificationId)
      .single();

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Invia email
    await transporter.sendMail({
      from: 'noreply@tuodominio.com',
      to: notification.recipient.email,
      subject: notification.title,
      html: notification.message
    });

    // Aggiorna stato
    await supabase
      .from('notifications')
      .update({ email_sent: true })
      .eq('id', notificationId);

    res.json({ success: true });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## Middleware di autenticazione

```javascript
// api-server/src/middleware/auth.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
}
```

---

## Deployment su VPS con Coolify

### 1. Crea Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]
```

### 2. Aggiungi in Coolify
- Crea nuovo servizio "API Server"
- Collega repository Git
- Imposta variabili d'ambiente
- Deploy automatico su push

### 3. Configura Nginx reverse proxy
```nginx
location /api/ {
  proxy_pass http://localhost:3001/api/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}
```

---

## Modifiche al Frontend

### PRIMA
```typescript
const { data, error } = await supabase.functions.invoke('send-notification-email', {
  body: { notificationId }
});
```

### DOPO
```typescript
const response = await fetch(`${process.env.VITE_API_URL}/api/emails/send-notification`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({ notificationId })
});

const data = await response.json();
```

---

## Vantaggi

✅ **Più semplice**: Node.js è più familiare di Deno
✅ **Più veloce**: No cold start delle Edge Functions
✅ **Debugging facile**: Puoi usare gli strumenti standard Node.js
✅ **Più flessibile**: Puoi usare qualsiasi libreria npm
✅ **Deployment semplice**: Un solo container Docker

---

## Script di migrazione

Posso creare uno script che converte automaticamente tutte le tue Edge Functions in route Express.
