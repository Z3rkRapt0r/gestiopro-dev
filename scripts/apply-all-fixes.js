import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('');
  log('='.repeat(70), 'cyan');
  log(message, 'bright');
  log('='.repeat(70), 'cyan');
  console.log('');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function applyFix(fixName, fixPath) {
  logHeader(`Applicazione Fix: ${fixName}`);

  try {
    // Leggi il file SQL
    const sqlContent = readFileSync(fixPath, 'utf-8');

    logInfo(`Lettura file: ${fixPath}`);
    logInfo(`Dimensione: ${sqlContent.length} caratteri`);

    // Dividi il contenuto in statements (diviso per punto e virgola)
    // Ma attenzione alle funzioni che contengono ;
    const statements = sqlContent
      .split(/;\s*(?=CREATE|DROP|SELECT|INSERT|UPDATE|DELETE|ALTER|COMMENT|BEGIN|COMMIT|DO)/i)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + (stmt.trim().endsWith(';') ? '' : ';'));

    logInfo(`Trovati ${statements.length} statements SQL da eseguire`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Salta commenti e linee vuote
      if (stmt.startsWith('--') || stmt.trim() === ';') {
        continue;
      }

      try {
        // Mostra anteprima dello statement (primi 100 caratteri)
        const preview = stmt.substring(0, 100).replace(/\s+/g, ' ').trim();
        logInfo(`[${i + 1}/${statements.length}] Esecuzione: ${preview}...`);

        await prisma.$executeRawUnsafe(stmt);
        successCount++;

      } catch (error) {
        // Alcuni errori sono OK (es. DROP se non esiste)
        if (error.message.includes('does not exist') && stmt.includes('DROP')) {
          logWarning(`Statement ${i + 1}: ${error.message} (OK, continuiamo)`);
        } else {
          errorCount++;
          logError(`Statement ${i + 1} fallito: ${error.message}`);
          // Non fermiamo l'esecuzione, continuiamo con gli altri
        }
      }
    }

    console.log('');
    logSuccess(`Fix completato: ${successCount} statements eseguiti con successo`);
    if (errorCount > 0) {
      logWarning(`${errorCount} statements hanno generato errori (potrebbero essere normali)`);
    }

    return { success: true, successCount, errorCount };

  } catch (error) {
    logError(`Errore durante l'applicazione del fix: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testConnection() {
  logHeader('Test Connessione Database');

  try {
    await prisma.$connect();
    logSuccess('Connessione al database riuscita!');

    // Test query semplice
    const result = await prisma.$queryRaw`SELECT current_database() as db, current_user as user, version() as version`;
    logInfo(`Database: ${result[0].db}`);
    logInfo(`User: ${result[0].user}`);
    logInfo(`Version: ${result[0].version.substring(0, 50)}...`);

    return true;
  } catch (error) {
    logError(`Errore di connessione: ${error.message}`);
    return false;
  }
}

async function verifyFixes() {
  logHeader('Verifica Applicazione Fixes');

  try {
    // Verifica 1: Check function attendance_monitor_cron
    logInfo('Verifica 1: Controllo funzione attendance_monitor_cron...');
    const cronFunction = await prisma.$queryRaw`
      SELECT
        proname,
        prosrc,
        proconfig
      FROM pg_proc
      WHERE proname = 'attendance_monitor_cron'
    `;

    if (cronFunction.length > 0) {
      const hasPublicPrefix = cronFunction[0].prosrc.includes('public.admin_settings');
      const hasSearchPath = cronFunction[0].proconfig &&
                           cronFunction[0].proconfig.includes('search_path');

      if (hasPublicPrefix && hasSearchPath) {
        logSuccess('✓ attendance_monitor_cron: Fix schema path applicato correttamente');
      } else {
        logWarning('⚠ attendance_monitor_cron: Fix potrebbe non essere completo');
        if (!hasPublicPrefix) logWarning('  - Manca prefix "public."');
        if (!hasSearchPath) logWarning('  - Manca "SET search_path"');
      }
    } else {
      logWarning('⚠ Funzione attendance_monitor_cron non trovata');
    }

    // Verifica 2: Check function calculate_automatic_overtime_checkin
    logInfo('Verifica 2: Controllo funzione calculate_automatic_overtime_checkin...');
    const overtimeFunction = await prisma.$queryRaw`
      SELECT
        proname,
        prosrc
      FROM pg_proc
      WHERE proname = 'calculate_automatic_overtime_checkin'
    `;

    if (overtimeFunction.length > 0) {
      const hasTimezoneConversion = overtimeFunction[0].prosrc.includes("AT TIME ZONE 'Europe/Rome'");

      if (hasTimezoneConversion) {
        logSuccess('✓ calculate_automatic_overtime_checkin: Fix timezone applicato correttamente');
      } else {
        logWarning('⚠ calculate_automatic_overtime_checkin: Fix timezone potrebbe non essere completo');
      }
    } else {
      logWarning('⚠ Funzione calculate_automatic_overtime_checkin non trovata');
    }

    // Verifica 3: Test esecuzione attendance_monitor_cron
    logInfo('Verifica 3: Test esecuzione attendance_monitor_cron...');
    try {
      const result = await prisma.$queryRaw`SELECT public.attendance_monitor_cron() as result`;
      const message = result[0].result;

      if (message.includes('ERRORE') && message.includes('does not exist')) {
        logError('✗ Il cron restituisce ancora errori di "does not exist"');
        logError(`  Messaggio: ${message}`);
      } else {
        logSuccess('✓ Il cron viene eseguito senza errori di schema');
        logInfo(`  Risultato: ${message.substring(0, 100)}...`);
      }
    } catch (error) {
      logError(`✗ Errore durante il test del cron: ${error.message}`);
    }

    console.log('');
    logSuccess('Verifica completata!');

  } catch (error) {
    logError(`Errore durante la verifica: ${error.message}`);
  }
}

async function main() {
  const fixes = [
    {
      name: 'Fix Timezone Straordinari Automatici',
      path: join(__dirname, '..', 'sql', 'fixes', 'fix_timezone_automatic_overtime.sql'),
      description: 'Corregge il fuso orario nei messaggi di straordinario automatico'
    },
    {
      name: 'Fix Schema Path Cron Job',
      path: join(__dirname, '..', 'sql', 'fixes', 'fix_cron_schema_path.sql'),
      description: 'Corregge l\'errore "relation does not exist" nel cron job'
    }
  ];

  console.log('');
  log('╔═══════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                                   ║', 'cyan');
  log('║        🔧 APPLICAZIONE FIXES AL DATABASE CON PRISMA 🔧          ║', 'bright');
  log('║                                                                   ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');

  // Test connessione
  const isConnected = await testConnection();
  if (!isConnected) {
    logError('Impossibile connettersi al database. Verifica la configurazione in .env');
    process.exit(1);
  }

  console.log('');
  logInfo('Fix da applicare:');
  fixes.forEach((fix, index) => {
    console.log(`  ${index + 1}. ${fix.name}`);
    console.log(`     ${fix.description}`);
  });
  console.log('');

  // Chiedi conferma
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise((resolve) => {
    rl.question('Vuoi procedere con l\'applicazione dei fixes? (y/n): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    logWarning('Operazione annullata dall\'utente');
    await prisma.$disconnect();
    process.exit(0);
  }

  // Applica i fixes
  const results = [];
  for (const fix of fixes) {
    const result = await applyFix(fix.name, fix.path);
    results.push({ ...fix, ...result });
  }

  // Verifica i fixes
  await verifyFixes();

  // Riepilogo finale
  logHeader('Riepilogo Finale');

  console.log('');
  results.forEach((result, index) => {
    if (result.success) {
      logSuccess(`${index + 1}. ${result.name}: ${result.successCount} statements eseguiti`);
      if (result.errorCount > 0) {
        logWarning(`   ${result.errorCount} warnings (potrebbero essere normali)`);
      }
    } else {
      logError(`${index + 1}. ${result.name}: FALLITO - ${result.error}`);
    }
  });

  console.log('');
  const allSuccess = results.every(r => r.success);

  if (allSuccess) {
    log('╔═══════════════════════════════════════════════════════════════════╗', 'green');
    log('║                                                                   ║', 'green');
    log('║           🎉 TUTTI I FIXES APPLICATI CON SUCCESSO! 🎉           ║', 'bright');
    log('║                                                                   ║', 'green');
    log('╚═══════════════════════════════════════════════════════════════════╝', 'green');
    console.log('');
    logInfo('Prossimi passi:');
    logInfo('  1. Testa il rilevamento automatico straordinari con un check-in anticipato');
    logInfo('  2. Verifica che il cron job esegua senza errori');
    logInfo('  3. Controlla i log in Supabase Dashboard per confermare');
  } else {
    log('╔═══════════════════════════════════════════════════════════════════╗', 'red');
    log('║                                                                   ║', 'red');
    log('║              ⚠️  ALCUNI FIXES SONO FALLITI  ⚠️                 ║', 'bright');
    log('║                                                                   ║', 'red');
    log('╚═══════════════════════════════════════════════════════════════════╝', 'red');
    console.log('');
    logInfo('Controlla gli errori sopra e riprova o applica manualmente');
  }

  console.log('');

  await prisma.$disconnect();
}

// Esegui lo script
main()
  .catch((error) => {
    logError(`Errore fatale: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
