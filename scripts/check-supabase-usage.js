#!/usr/bin/env node

/**
 * Script per verificare l'utilizzo corrente di Supabase
 * e confrontarlo con i limiti del Free Tier
 */

import { PrismaClient } from '../src/generated/prisma/index.js';
import 'dotenv/config';

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

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function progressBar(current, max, width = 40) {
  const percentage = (current / max) * 100;
  const filled = Math.round((current / max) * width);
  const empty = width - filled;

  let color = 'green';
  if (percentage > 80) color = 'red';
  else if (percentage > 60) color = 'yellow';

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${colors[color]}[${bar}] ${percentage.toFixed(1)}%${colors.reset}`;
}

async function checkUsage() {
  console.log('\n');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('      📊 VERIFICA UTILIZZO SUPABASE FREE TIER', 'bright');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('\n');

  try {
    await prisma.$connect();

    // 1. Database Size
    log('💾 DATABASE SIZE', 'yellow');
    log('─────────────────────────────────────────────────────────', 'cyan');

    const dbSizeResult = await prisma.$queryRaw`
      SELECT pg_database_size(current_database()) as bytes
    `;
    const dbSizeBytes = Number(dbSizeResult[0].bytes);
    const dbSizeMB = dbSizeBytes / (1024 * 1024);
    const freeTierDbLimit = 500; // MB

    console.log(`  Utilizzato: ${formatBytes(dbSizeBytes)} (${dbSizeMB.toFixed(2)} MB)`);
    console.log(`  Limite Free: ${freeTierDbLimit} MB`);
    console.log(`  ${progressBar(dbSizeMB, freeTierDbLimit)}`);

    if (dbSizeMB < freeTierDbLimit * 0.5) {
      log(`  ✅ Ottimo! Hai ancora ${(freeTierDbLimit - dbSizeMB).toFixed(2)} MB disponibili\n`, 'green');
    } else if (dbSizeMB < freeTierDbLimit * 0.8) {
      log(`  ⚠️  Attenzione: rimangono ${(freeTierDbLimit - dbSizeMB).toFixed(2)} MB\n`, 'yellow');
    } else {
      log(`  ❌ Database quasi pieno! Considera l'upgrade\n`, 'red');
    }

    // 2. Database per tabella
    log('📋 DIMENSIONE TABELLE TOP 10', 'yellow');
    log('─────────────────────────────────────────────────────────', 'cyan');

    const tableSizes = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        pg_total_relation_size(schemaname||'.'||tablename) AS bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `;

    tableSizes.forEach((table, idx) => {
      const size = formatBytes(Number(table.bytes));
      console.log(`  ${(idx + 1).toString().padStart(2)}. ${table.tablename.padEnd(30)} ${size}`);
    });
    console.log('');

    // 3. Record count per tabella
    log('📊 NUMERO RECORD', 'yellow');
    log('─────────────────────────────────────────────────────────', 'cyan');

    const tables = [
      { name: 'profiles', model: 'profiles' },
      { name: 'attendances', model: 'attendances' },
      { name: 'leave_requests', model: 'leaveRequests' },
      { name: 'documents', model: 'documents' },
      { name: 'notifications', model: 'notifications' },
      { name: 'overtime_entries', model: 'overtimeEntries' },
      { name: 'attendance_alerts', model: 'attendanceAlerts' }
    ];

    let totalRecords = 0;
    for (const table of tables) {
      try {
        const count = await prisma[table.model].count();
        totalRecords += count;
        console.log(`  ${table.name.padEnd(25)} ${count.toLocaleString().padStart(10)} records`);
      } catch (err) {
        console.log(`  ${table.name.padEnd(25)} ${'N/A'.padStart(10)}`);
      }
    }
    console.log(`  ${'─'.repeat(59)}`);
    console.log(`  ${'TOTALE'.padEnd(25)} ${totalRecords.toLocaleString().padStart(10)} records\n`);

    // 4. Connessioni attive
    log('🔌 CONNESSIONI DATABASE', 'yellow');
    log('─────────────────────────────────────────────────────────', 'cyan');

    const connections = await prisma.$queryRaw`
      SELECT count(*) as count FROM pg_stat_activity
      WHERE datname = current_database()
    `;
    const activeConnections = Number(connections[0].count);
    const freeTierConnLimit = 60;

    console.log(`  Connessioni attive: ${activeConnections}`);
    console.log(`  Limite Free: ${freeTierConnLimit}`);
    console.log(`  ${progressBar(activeConnections, freeTierConnLimit)}`);

    if (activeConnections < freeTierConnLimit * 0.5) {
      log(`  ✅ Ottimo! Solo ${activeConnections}/${freeTierConnLimit} connessioni in uso\n`, 'green');
    } else if (activeConnections < freeTierConnLimit * 0.8) {
      log(`  ⚠️  Attenzione: ${activeConnections}/${freeTierConnLimit} connessioni\n`, 'yellow');
    } else {
      log(`  ❌ Troppe connessioni! Rischio deadlock\n`, 'red');
    }

    // 5. Query lente
    log('🐌 QUERY LENTE (> 1 secondo)', 'yellow');
    log('─────────────────────────────────────────────────────────', 'cyan');

    try {
      const slowQueries = await prisma.$queryRaw`
        SELECT
          LEFT(query, 80) as query_preview,
          mean_exec_time::numeric(10,2) as avg_time_ms,
          calls
        FROM pg_stat_statements
        WHERE mean_exec_time > 1000
        AND query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC
        LIMIT 5
      `;

      if (slowQueries.length === 0) {
        log('  ✅ Nessuna query lenta trovata!\n', 'green');
      } else {
        slowQueries.forEach((q, idx) => {
          console.log(`  ${idx + 1}. Tempo medio: ${Number(q.avg_time_ms).toFixed(2)}ms (${q.calls} chiamate)`);
          console.log(`     ${q.query_preview}...`);
        });
        console.log('');
      }
    } catch (err) {
      log('  ⚠️  pg_stat_statements non disponibile (serve superuser)\n', 'yellow');
    }

    // 6. Utenti attivi
    log('👥 UTENTI', 'yellow');
    log('─────────────────────────────────────────────────────────', 'cyan');

    const totalUsers = await prisma.profiles.count();
    const activeUsers = await prisma.profiles.count({ where: { is_active: true } });
    const employees = await prisma.profiles.count({ where: { role: 'employee' } });
    const admins = await prisma.profiles.count({ where: { role: 'admin' } });

    console.log(`  Totale utenti:   ${totalUsers}`);
    console.log(`  Utenti attivi:   ${activeUsers}`);
    console.log(`  Dipendenti:      ${employees}`);
    console.log(`  Admin:           ${admins}\n`);

    // 7. Stima bandwidth mensile (basata su query)
    log('📡 BANDWIDTH STIMATO', 'yellow');
    log('─────────────────────────────────────────────────────────', 'cyan');

    // Calcola dimensione media response
    const avgResponseSize = dbSizeMB / totalRecords; // MB per record
    const estimatedDailyQueries = activeUsers * 50; // Stima: 50 query per utente al giorno
    const estimatedMonthlyBandwidthMB = estimatedDailyQueries * 30 * avgResponseSize;
    const freeTierBandwidthGB = 2;

    console.log(`  Query stimate giornaliere: ${estimatedDailyQueries}`);
    console.log(`  Query stimate mensili: ${estimatedDailyQueries * 30}`);
    console.log(`  Bandwidth stimato mensile: ${estimatedMonthlyBandwidthMB.toFixed(2)} MB`);
    console.log(`  Limite Free: ${freeTierBandwidthGB} GB (${freeTierBandwidthGB * 1024} MB)`);
    console.log(`  ${progressBar(estimatedMonthlyBandwidthMB, freeTierBandwidthGB * 1024)}`);

    if (estimatedMonthlyBandwidthMB < freeTierBandwidthGB * 1024 * 0.8) {
      log(`  ✅ Bandwidth ampiamente sufficiente\n`, 'green');
    } else {
      log(`  ⚠️  Potresti superare il limite (€0.09/GB extra)\n`, 'yellow');
    }

    // 8. Raccomandazione finale
    console.log('\n');
    log('🎯 RACCOMANDAZIONE', 'yellow');
    log('─────────────────────────────────────────────────────────', 'cyan');
    console.log('\n');

    const dbUsagePercent = (dbSizeMB / freeTierDbLimit) * 100;
    const connUsagePercent = (activeConnections / freeTierConnLimit) * 100;

    if (dbUsagePercent < 50 && connUsagePercent < 50 && activeUsers < 30) {
      log('  ✅ RESTA SU FREE TIER', 'green');
      console.log('\n  Motivi:');
      console.log('    • Database usage: ' + dbUsagePercent.toFixed(1) + '% (ottimo!)');
      console.log('    • Connections: ' + connUsagePercent.toFixed(1) + '% (ottimo!)');
      console.log('    • Utenti: ' + activeUsers + ' (molto sotto il limite)');
      console.log('\n  Puoi crescere tranquillamente per i prossimi 2-3 anni!');

    } else if (dbUsagePercent < 80 && connUsagePercent < 80 && activeUsers < 50) {
      log('  ⚠️  MONITORA ATTENTAMENTE', 'yellow');
      console.log('\n  Situazione:');
      console.log('    • Database usage: ' + dbUsagePercent.toFixed(1) + '%');
      console.log('    • Connections: ' + connUsagePercent.toFixed(1) + '%');
      console.log('    • Utenti: ' + activeUsers);
      console.log('\n  Cosa fare:');
      console.log('    1. Monitora performance settimanalmente');
      console.log('    2. Se vedi rallentamenti → valuta PRO');
      console.log('    3. Fai pulizia dati vecchi periodicamente');

    } else {
      log('  🚀 VALUTA UPGRADE A PRO', 'red');
      console.log('\n  Motivi:');
      console.log('    • Database usage: ' + dbUsagePercent.toFixed(1) + '%');
      console.log('    • Connections: ' + connUsagePercent.toFixed(1) + '%');
      console.log('    • Utenti: ' + activeUsers);
      console.log('\n  Benefici PRO:');
      console.log('    • 8GB database (vs 500MB)');
      console.log('    • 200 connections (vs 60)');
      console.log('    • Performance 2-3x migliori');
      console.log('    • Backup automatici');
      console.log('    • Email support');
      console.log('\n  Costo: $25/mese (~€25/mese)');
    }

    // 9. Prossimi passi
    console.log('\n');
    log('📚 PROSSIMI PASSI', 'yellow');
    log('─────────────────────────────────────────────────────────', 'cyan');
    console.log('\n  1. Leggi: docs/SUPABASE_CLOUD_PERFORMANCE.md');
    console.log('  2. Monitora dashboard Supabase: https://supabase.com/dashboard');
    console.log('  3. Esegui questo script settimanalmente');
    console.log('  4. Se performance scadono → considera upgrade');
    console.log('\n');

    log('═══════════════════════════════════════════════════════════', 'cyan');
    console.log('\n');

  } catch (error) {
    log(`\n❌ Errore: ${error.message}\n`, 'red');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsage();
