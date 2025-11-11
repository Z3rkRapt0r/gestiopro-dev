# Guida all'uso di Prisma nel progetto

## Introduzione

Prisma è stato configurato per lavorare con il database PostgreSQL di Supabase. Questo documento spiega come utilizzare Prisma per le operazioni CRUD.

## File importanti

- **Schema Prisma**: `prisma/schema.prisma` - Definisce i modelli del database
- **Client Prisma**: `src/lib/prisma.ts` - Istanza del client Prisma da usare nell'app
- **Tipi generati**: `src/generated/prisma/` - Tipi TypeScript generati automaticamente

## Configurazione

La connection string del database è configurata in `.env`:

```env
DATABASE_URL="postgresql://postgres.nohufgceuqhkycsdffqj:Escolca56..@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

## Comandi utili

```bash
# Genera il Prisma Client dopo modifiche allo schema
npm run prisma:generate

# Apre Prisma Studio per visualizzare/modificare i dati
npm run prisma:studio
```

## Esempi di utilizzo

### 1. Importare il client Prisma

```typescript
import prisma from '@/lib/prisma';
```

### 2. Query di esempio

#### Ottenere tutti gli utenti
```typescript
const users = await prisma.profiles.findMany({
  include: {
    attendances: true,
    leave_requests: true
  }
});
```

#### Ottenere un utente specifico
```typescript
const user = await prisma.profiles.findUnique({
  where: {
    id: 'user-uuid-here'
  },
  include: {
    attendances: {
      where: {
        date: {
          gte: new Date('2025-01-01')
        }
      }
    }
  }
});
```

#### Creare una presenza
```typescript
const attendance = await prisma.attendances.create({
  data: {
    user_id: 'user-uuid',
    date: new Date(),
    check_in_time: new Date(),
    check_in_latitude: 45.4642,
    check_in_longitude: 9.1900
  }
});
```

#### Aggiornare una presenza
```typescript
const updatedAttendance = await prisma.attendances.update({
  where: {
    id: 'attendance-uuid'
  },
  data: {
    check_out_time: new Date()
  }
});
```

#### Creare una richiesta di ferie
```typescript
const leaveRequest = await prisma.leave_requests.create({
  data: {
    user_id: 'user-uuid',
    start_date: new Date('2025-07-01'),
    end_date: new Date('2025-07-07'),
    type: 'vacation',
    reason: 'Summer holidays',
    status: 'pending'
  }
});
```

#### Query con filtri e ordinamento
```typescript
const overtimeRecords = await prisma.overtime_records.findMany({
  where: {
    user_id: 'user-uuid',
    status: 'approved',
    date: {
      gte: new Date('2025-01-01'),
      lte: new Date('2025-12-31')
    }
  },
  orderBy: {
    date: 'desc'
  },
  take: 10
});
```

#### Aggregazioni
```typescript
const totalOvertimeHours = await prisma.overtime_records.aggregate({
  where: {
    user_id: 'user-uuid',
    status: 'approved'
  },
  _sum: {
    hours: true
  }
});
```

#### Transazioni
```typescript
const result = await prisma.$transaction(async (tx) => {
  // Crea una presenza
  const attendance = await tx.attendances.create({
    data: {
      user_id: 'user-uuid',
      date: new Date(),
      check_in_time: new Date()
    }
  });

  // Aggiorna i working days tracking
  await tx.working_days_tracking.upsert({
    where: {
      user_id_date: {
        user_id: 'user-uuid',
        date: new Date()
      }
    },
    create: {
      user_id: 'user-uuid',
      date: new Date(),
      is_working_day: true
    },
    update: {
      is_working_day: true
    }
  });

  return attendance;
});
```

### 3. Uso in hooks React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import prisma from '@/lib/prisma';

export const useUserProfile = (userId: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      return await prisma.profiles.findUnique({
        where: { id: userId },
        include: {
          attendances: {
            orderBy: { date: 'desc' },
            take: 30
          },
          employee_leave_balance: true
        }
      });
    }
  });
};
```

## Note importanti

1. **Uso server-side**: Prisma deve essere usato solo in contesti server-side (Node.js). Per applicazioni client-side come React, usa Prisma tramite API routes o server functions.

2. **Connection pooling**: Stiamo usando il connection pooler di Supabase (porta 6543) per gestire meglio le connessioni.

3. **TypeScript**: Tutti i modelli hanno tipi TypeScript generati automaticamente per una migliore esperienza di sviluppo.

4. **Schema sync**: Lo schema Prisma è stato creato manualmente basandosi sui tipi TypeScript esistenti di Supabase. Se aggiungi nuove tabelle in Supabase, dovrai aggiornare manualmente lo schema Prisma.

## Modelli disponibili

- `profiles` - Profili utente
- `admin_settings` - Impostazioni amministratore
- `attendances` - Presenze
- `business_trips` - Trasferte
- `documents` - Documenti
- `leave_requests` - Richieste di ferie
- `overtime_records` - Straordinari
- `notifications` - Notifiche
- `sent_notifications` - Email inviate
- `sick_leaves` - Malattie
- `employee_leave_balance` - Saldo ferie dipendenti
- `work_schedules` - Orari di lavoro
- `company_holidays` - Festività aziendali
- `dashboard_settings` - Impostazioni dashboard
- `employee_logo_settings` - Logo dipendenti
- `employee_work_schedules` - Orari dipendenti
- `manual_attendances` - Presenze manuali
- `working_days_tracking` - Tracciamento giorni lavorativi
- `email_templates` - Template email
- `attendance_settings` - Impostazioni presenze
- `login_settings` - Impostazioni login

## Risorse

- [Documentazione Prisma](https://www.prisma.io/docs)
- [Prisma Client API Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Prisma con Supabase](https://www.prisma.io/docs/guides/database/supabase)
