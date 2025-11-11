#!/usr/bin/env node

/**
 * Script per analizzare il progetto e determinare se conviene migrare
 */

import { PrismaClient } from '../src/generated/prisma/index.js';
import 'dotenv/config';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

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

async function getDirectorySize(dirPath) {
  let totalSize = 0;
  try {
    const files = await readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSize += await getDirectorySize(filePath);
      } else {
        const stats = await stat(filePath);
        totalSize += stats.size;
      }
    }
  } catch (err) {
    // Ignora errori di permessi
  }
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function analyze() {
  console.log('\n');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('   📊 ANALISI MIGRAZIONE SUPABASE CLOUD → SELF-HOSTED', 'bright');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('\n');

  // 1. Analisi Database
  log('📦 ANALISI DATABASE', 'yellow');
  log('─────────────────────────────────────────────────────────', 'cyan');

  try {
    await prisma.$connect();

    // Conta record per tabella
    const tables = [
      'profiles',
      'attendances',
      'leave_requests',
      'documents',
      'notifications',
      'overtime_entries',
      'attendance_alerts'
    ];

    let totalRecords = 0;
    for (const table of tables) {
      try {
        const count = await prisma[table].count();
        totalRecords += count;
        console.log(`  ${table.padEnd(25)} ${count.toLocaleString()} records`);
      } catch (err) {
        console.log(`  ${table.padEnd(25)} N/A`);
      }
    }

    console.log(`  ${'─'.repeat(59)}`);
    console.log(`  ${'TOTALE'.padEnd(25)} ${totalRecords.toLocaleString()} records\n`);

    // Stima dimensione database
    const dbSizeResult = await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    log(`  Dimensione database: ${dbSizeResult[0].size}`, 'green');

  } catch (err) {
    log(`  ❌ Errore connessione database: ${err.message}`, 'red');
  }

  // 2. Analisi Edge Functions
  console.log('\n');
  log('⚡ ANALISI EDGE FUNCTIONS', 'yellow');
  log('─────────────────────────────────────────────────────────', 'cyan');

  try {
    const functionsDir = './supabase/functions';
    const functions = await readdir(functionsDir, { withFileTypes: true });
    const edgeFunctions = functions.filter(f => f.isDirectory());

    console.log(`  Totale Edge Functions: ${edgeFunctions.length}\n`);

    // Categorizza per complessità
    const critical = ['send-notification-email', 'send-leave-request-email', 'attendance-monitor', 'create-employee'];
    const medium = ['compress-document', 'delete-document', 'send-employee-message', 'check-missing-attendance'];

    console.log('  Priorità Alta (necessarie subito):');
    critical.forEach(fn => {
      if (edgeFunctions.find(f => f.name === fn)) {
        console.log(`    ✓ ${fn}`);
      }
    });

    console.log('\n  Priorità Media:');
    medium.forEach(fn => {
      if (edgeFunctions.find(f => f.name === fn)) {
        console.log(`    ✓ ${fn}`);
      }
    });

    console.log('\n  Priorità Bassa:');
    edgeFunctions.forEach(fn => {
      if (!critical.includes(fn.name) && !medium.includes(fn.name)) {
        console.log(`    ✓ ${fn.name}`);
      }
    });

    log(`\n  Tempo stimato conversione: ${edgeFunctions.length * 1.5}-${edgeFunctions.length * 2} ore`, 'yellow');

  } catch (err) {
    log('  ❌ Cartella functions non trovata', 'red');
  }

  // 3. Analisi Storage (stima locale)
  console.log('\n');
  log('💾 ANALISI STORAGE', 'yellow');
  log('─────────────────────────────────────────────────────────', 'cyan');

  try {
    const storageSize = await getDirectorySize('./public');
    log(`  Dimensione storage locale: ${formatBytes(storageSize)}`, 'green');
    log('  (Storage Supabase remoto da verificare manualmente)', 'yellow');
  } catch (err) {
    log('  ⚠️  Impossibile calcolare storage', 'yellow');
  }

  // 4. Analisi Utenti
  console.log('\n');
  log('👥 ANALISI UTENTI', 'yellow');
  log('─────────────────────────────────────────────────────────', 'cyan');

  try {
    const totalUsers = await prisma.profiles.count();
    const activeUsers = await prisma.profiles.count({ where: { is_active: true } });
    const employees = await prisma.profiles.count({ where: { role: 'employee' } });
    const admins = await prisma.profiles.count({ where: { role: 'admin' } });

    console.log(`  Totale utenti: ${totalUsers}`);
    console.log(`  Utenti attivi: ${activeUsers}`);
    console.log(`  Dipendenti: ${employees}`);
    console.log(`  Admin: ${admins}`);

  } catch (err) {
    log(`  ❌ Errore: ${err.message}`, 'red');
  }

  // 5. Costi stimati
  console.log('\n');
  log('💰 ANALISI COSTI', 'yellow');
  log('─────────────────────────────────────────────────────────', 'cyan');

  try {
    const dbSizeResult = await prisma.$queryRaw`
      SELECT pg_database_size(current_database()) as bytes
    `;
    const dbSizeGB = dbSizeResult[0].bytes / (1024 * 1024 * 1024);

    console.log('\n  SUPABASE CLOUD:');
    if (dbSizeGB < 0.5) {
      log('    Free Tier: €0/mese ✅', 'green');
    } else if (dbSizeGB < 8) {
      log('    Pro Plan: €25/mese ⚠️', 'yellow');
    } else {
      log('    Team Plan: €599/mese ❌', 'red');
    }

    console.log('\n  SELF-HOSTED:');
    log('    VPS Hostinger: €24/mese', 'cyan');
    log('    Cloudflare R2: €1-5/mese', 'cyan');
    log('    Resend Email: €0-20/mese', 'cyan');
    log('    ──────────────────────────', 'cyan');
    log('    TOTALE: €25-50/mese', 'green');

  } catch (err) {
    log('  ❌ Impossibile calcolare costi', 'red');
  }

  // 6. Raccomandazione
  console.log('\n');
  log('🎯 RACCOMANDAZIONE', 'yellow');
  log('─────────────────────────────────────────────────────────', 'cyan');

  try {
    const totalUsers = await prisma.profiles.count();
    const dbSizeResult = await prisma.$queryRaw`
      SELECT pg_database_size(current_database()) as bytes
    `;
    const dbSizeGB = dbSizeResult[0].bytes / (1024 * 1024 * 1024);

    console.log('\n');

    if (totalUsers < 50 && dbSizeGB < 0.5) {
      log('  ✅ RESTA SU SUPABASE CLOUD (Free Tier)', 'green');
      console.log('\n  Motivi:');
      console.log('    • Stai ancora nel free tier');
      console.log('    • Pochi utenti');
      console.log('    • Database piccolo');
      console.log('    • Non conviene il lavoro di migrazione');
      console.log('\n  Quando migrare:');
      console.log('    • Superi 100 utenti attivi');
      console.log('    • Database > 8GB');
      console.log('    • Bandwidth > 100GB/mese');

    } else if (totalUsers < 200 && dbSizeGB < 8) {
      log('  ⚠️  VALUTA ATTENTAMENTE', 'yellow');
      console.log('\n  Opzione A: Supabase Pro (€25/mese)');
      console.log('    PRO: Zero lavoro, supporto, affidabilità');
      console.log('    CONTRO: Costo ricorrente');
      console.log('\n  Opzione B: Self-Hosted (€40/mese)');
      console.log('    PRO: Controllo totale, scalabilità');
      console.log('    CONTRO: 40-60 ore setup, manutenzione');
      console.log('\n  Considera:');
      console.log('    • 60 ore lavoro = €3000+ valore tempo');
      console.log('    • Differenza costo: €15/mese = €180/anno');
      console.log('    • Break-even: 16+ anni!');

    } else {
      log('  ✅ VAI SELF-HOSTED', 'green');
      console.log('\n  Motivi:');
      console.log('    • Molti utenti/dati');
      console.log('    • Costi Supabase alti');
      console.log('    • Vale investimento iniziale');
      console.log('\n  Strategia consigliata:');
      console.log('    1. Database: Self-hosted ✓');
      console.log('    2. Auth: Self-hosted ✓');
      console.log('    3. Storage: Cloudflare R2');
      console.log('    4. API: Express sul VPS');
      console.log('    5. Email: Resend');
    }

  } catch (err) {
    log('  ❌ Impossibile generare raccomandazione', 'red');
  }

  console.log('\n');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('\n');
  log('📚 PROSSIMI PASSI:', 'bright');
  console.log('\n  1. Leggi: docs/MIGRATION_MASTER_PLAN.md');
  console.log('  2. Decidi: Cloud vs Self-Hosted vs Ibrido');
  console.log('  3. Se migri: Segui il piano step-by-step');
  console.log('\n');

  await prisma.$disconnect();
}

analyze().catch(err => {
  console.error('Errore:', err);
  process.exit(1);
});
