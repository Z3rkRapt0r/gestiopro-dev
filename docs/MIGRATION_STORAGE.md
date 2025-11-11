# Migrazione Supabase Storage

## Situazione

Supabase Self-Hosted include Storage, ma ha limitazioni.

---

## OPZIONE A: Usa Supabase Storage Self-Hosted (Più semplice)

### Pro
✅ Stesso codice frontend
✅ Incluso in Supabase self-hosted
✅ Supporta RLS (Row Level Security)

### Contro
⚠️ Performance inferiori rispetto a S3
⚠️ Devi gestire backup manualmente
⚠️ Storage sul VPS (limitato dallo spazio disco)

### Setup
```bash
# Nel docker-compose.yml di Supabase
services:
  storage:
    image: supabase/storage-api:latest
    environment:
      - STORAGE_BACKEND=file  # O 's3' se vuoi usare S3
      - FILE_SIZE_LIMIT=52428800
      - STORAGE_FILE_PATH=/var/lib/storage
    volumes:
      - ./volumes/storage:/var/lib/storage
```

### Migrare i file esistenti
```javascript
// Script di migrazione storage
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseCloud = createClient(
  'https://nohufgceuqhkycsdffqj.supabase.co',
  'service_role_key'
);

const supabaseSelfHost = createClient(
  'https://tuovps.com',
  'service_role_key'
);

async function migrateStorage() {
  // Lista tutti i bucket
  const { data: buckets } = await supabaseCloud.storage.listBuckets();

  for (const bucket of buckets) {
    console.log(`Migrating bucket: ${bucket.name}`);

    // Crea bucket in self-hosted
    await supabaseSelfHost.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit
    });

    // Lista tutti i file nel bucket
    const { data: files } = await supabaseCloud.storage
      .from(bucket.name)
      .list('', { limit: 1000 });

    for (const file of files) {
      // Download da cloud
      const { data: fileData } = await supabaseCloud.storage
        .from(bucket.name)
        .download(file.name);

      // Upload a self-hosted
      await supabaseSelfHost.storage
        .from(bucket.name)
        .upload(file.name, fileData, {
          contentType: file.metadata.mimetype,
          upsert: true
        });

      console.log(`✓ Migrated: ${file.name}`);
    }
  }

  console.log('Storage migration completed!');
}

migrateStorage();
```

---

## ✅ OPZIONE B: MinIO (CONSIGLIATO per produzione)

MinIO è un object storage compatibile S3, perfetto per self-hosted.

### Pro
✅ Performance eccellenti
✅ Compatibile S3 (standard de facto)
✅ UI integrata per gestire file
✅ Backup automatici
✅ Scalabile
✅ Gratuito e open source

### Contro
⚠️ Devi modificare il codice per upload/download

### Setup MinIO con Coolify

1. **Installa MinIO in Coolify**
```bash
# Coolify ha MinIO già disponibile
# Aggiungi servizio → MinIO
```

2. **Configura MinIO**
```bash
# Variabili d'ambiente
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=your_secure_password
MINIO_BROWSER_REDIRECT_URL=https://minio.tuodominio.com
```

3. **Crea bucket**
```bash
# Accedi alla UI di MinIO
https://minio.tuodominio.com

# Crea bucket: documents, logos, avatars, etc.
```

4. **Installa client nel progetto**
```bash
npm install minio
```

5. **Crea wrapper per MinIO**
```typescript
// src/lib/storage.ts
import { Client } from 'minio';

const minioClient = new Client({
  endPoint: process.env.VITE_MINIO_ENDPOINT || 'minio.tuodominio.com',
  port: 443,
  useSSL: true,
  accessKey: process.env.VITE_MINIO_ACCESS_KEY,
  secretKey: process.env.VITE_MINIO_SECRET_KEY
});

export const storage = {
  // Upload file
  async upload(bucket: string, fileName: string, file: File) {
    const buffer = await file.arrayBuffer();
    await minioClient.putObject(
      bucket,
      fileName,
      Buffer.from(buffer),
      file.size,
      { 'Content-Type': file.type }
    );

    // Genera URL pubblico (se bucket pubblico)
    return `https://minio.tuodominio.com/${bucket}/${fileName}`;
  },

  // Download file
  async download(bucket: string, fileName: string) {
    const dataStream = await minioClient.getObject(bucket, fileName);
    const chunks: Buffer[] = [];

    return new Promise<Blob>((resolve, reject) => {
      dataStream.on('data', chunk => chunks.push(chunk));
      dataStream.on('end', () => resolve(new Blob(chunks)));
      dataStream.on('error', reject);
    });
  },

  // Delete file
  async delete(bucket: string, fileName: string) {
    await minioClient.removeObject(bucket, fileName);
  },

  // List files
  async list(bucket: string, prefix?: string) {
    const stream = minioClient.listObjectsV2(bucket, prefix, true);
    const files: any[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', obj => files.push(obj));
      stream.on('end', () => resolve(files));
      stream.on('error', reject);
    });
  },

  // Get URL firmato (pre-signed URL per file privati)
  async getSignedUrl(bucket: string, fileName: string, expiry = 3600) {
    return await minioClient.presignedGetObject(bucket, fileName, expiry);
  }
};
```

6. **Modifica codice upload**

**PRIMA (Supabase Storage):**
```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .upload(fileName, file);
```

**DOPO (MinIO):**
```typescript
import { storage } from '@/lib/storage';

const url = await storage.upload('documents', fileName, file);

// Salva URL nel database
await supabase
  .from('documents')
  .insert({
    name: fileName,
    url: url,
    user_id: userId
  });
```

---

## OPZIONE C: S3 Compatible (Cloudflare R2, Backblaze B2)

Alternative economiche a AWS S3:

### Cloudflare R2
- **Costo**: $0.015/GB/mese storage, ZERO egress (download gratis!)
- **Pro**: Performance globali, nessun costo bandwidth
- **Setup**: Uguale a MinIO, compatibile S3

### Backblaze B2
- **Costo**: $0.005/GB/mese storage, $0.01/GB download
- **Pro**: Molto economico
- **Setup**: Compatibile S3

```typescript
// Stessa libreria MinIO funziona con R2 e B2
const client = new Client({
  endPoint: 'accountid.r2.cloudflarestorage.com',  // Cloudflare R2
  // O: 's3.us-west-000.backblazeb2.com',         // Backblaze B2
  accessKey: 'your_access_key',
  secretKey: 'your_secret_key'
});
```

---

## 🎯 RACCOMANDAZIONE

**Per il tuo caso:**

1. **Se vuoi semplicità**: Usa Supabase Storage Self-Hosted
   - Zero modifiche al codice
   - Funziona subito
   - Vai così se hai < 100GB file

2. **Se vuoi performance e scalabilità**: Usa MinIO sul VPS
   - Più performante
   - Più professionale
   - Poche modifiche al codice

3. **Se vuoi risparmio a lungo termine**: Usa Cloudflare R2
   - Più economico
   - Download gratuiti (perfetto per documenti)
   - CDN globale incluso

---

## Comparazione Costi (esempio 100GB storage, 500GB download/mese)

| Soluzione | Storage | Bandwidth | Totale/mese |
|-----------|---------|-----------|-------------|
| Supabase Self-Hosted | Incluso VPS | Incluso | €0 (nel VPS) |
| MinIO (VPS) | Incluso VPS | Incluso VPS | €0 (nel VPS) |
| Cloudflare R2 | $1.50 | **$0** | **$1.50** ⭐ |
| Backblaze B2 | $0.50 | $5.00 | $5.50 |
| AWS S3 | $2.30 | $45.00 | $47.30 💸 |

---

## Checklist Migrazione Storage

- [ ] Scegli soluzione (Supabase/MinIO/R2/B2)
- [ ] Configura servizio storage
- [ ] Crea bucket necessari
- [ ] Configura CORS se necessario
- [ ] Esporta file da Supabase Cloud
- [ ] Importa file nel nuovo storage
- [ ] Modifica codice upload/download
- [ ] Aggiorna URL nel database
- [ ] Testa upload
- [ ] Testa download
- [ ] Testa cancellazione
- [ ] Configura backup

**Tempo stimato:**
- Supabase Storage: 2-3 ore
- MinIO: 4-6 ore
- R2/B2: 4-6 ore
