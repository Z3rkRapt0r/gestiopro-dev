import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔧 APPLICAZIONE FIXES AL DATABASE\n');

  try {
    // Test connessione
    await prisma.$connect();
    console.log('✅ Connesso al database\n');

    // Fix 1: Timezone
    console.log('📝 Applicazione Fix 1: Timezone Straordinari...');
    const timezoneSql = readFileSync(
      join(__dirname, '..', 'sql', 'fixes', 'fix_timezone_automatic_overtime.sql'),
      'utf-8'
    );

    await prisma.$executeRawUnsafe(timezoneSql);
    console.log('✅ Fix Timezone applicato\n');

    // Fix 2: Cron Schema Path
    console.log('📝 Applicazione Fix 2: Cron Schema Path...');
    const cronSql = readFileSync(
      join(__dirname, '..', 'sql', 'fixes', 'fix_cron_schema_path.sql'),
      'utf-8'
    );

    await prisma.$executeRawUnsafe(cronSql);
    console.log('✅ Fix Cron Schema Path applicato\n');

    // Verifica
    console.log('🔍 Verifica fixes...\n');

    const testResult = await prisma.$queryRaw`SELECT public.attendance_monitor_cron() as result`;
    const message = testResult[0].result;

    if (message.includes('ERRORE') && message.includes('does not exist')) {
      console.log('❌ Il cron restituisce ancora errori');
      console.log(`   ${message}\n`);
    } else {
      console.log('✅ Il cron funziona correttamente');
      console.log(`   ${message.substring(0, 100)}...\n`);
    }

    console.log('🎉 Applicazione completata!\n');

  } catch (error) {
    console.error('❌ Errore:', error.message);
    console.error('\nDettagli:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
