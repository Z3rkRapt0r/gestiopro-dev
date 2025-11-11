#!/usr/bin/env node

/**
 * Script to check attendance alerts status
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function checkAttendanceAlerts() {
  console.log('🔍 Verificando attendance alerts...\n');

  try {
    const today = new Date().toISOString().split('T')[0];

    // Get all alerts for today
    const alerts = await prisma.$queryRaw`
      SELECT
        aa.id,
        aa.employee_id,
        aa.admin_id,
        aa.alert_date,
        aa.alert_time,
        aa.expected_time,
        aa.email_sent_at,
        aa.created_at,
        p.first_name,
        p.last_name,
        p.email as employee_email
      FROM attendance_alerts aa
      LEFT JOIN profiles p ON aa.employee_id = p.id
      WHERE aa.alert_date = ${today}
      ORDER BY aa.created_at DESC
    `;

    console.log(`📊 Alert trovati per oggi (${today}): ${alerts.length}\n`);

    if (alerts.length === 0) {
      console.log('❌ Nessun alert trovato per oggi\n');
      return;
    }

    alerts.forEach((alert, index) => {
      console.log(`Alert ${index + 1}:`);
      console.log(`  ID: ${alert.id}`);
      console.log(`  Dipendente: ${alert.first_name} ${alert.last_name} (${alert.employee_email})`);
      console.log(`  Data: ${alert.alert_date}`);
      console.log(`  Ora alert: ${alert.alert_time}`);
      console.log(`  Ora prevista: ${alert.expected_time}`);
      console.log(`  Email inviata: ${alert.email_sent_at ? '✅ Sì - ' + alert.email_sent_at : '❌ No'}`);
      console.log(`  Creato: ${alert.created_at}`);
      console.log('');
    });

    // Count by status
    const sentCount = alerts.filter(a => a.email_sent_at).length;
    const pendingCount = alerts.filter(a => !a.email_sent_at).length;

    console.log(`\n📈 Riepilogo:`);
    console.log(`  ✅ Email inviate: ${sentCount}`);
    console.log(`  ⏳ In attesa: ${pendingCount}`);

    if (pendingCount > 0) {
      console.log('\n⚠️  Ci sono alert in attesa di invio!');
      console.log('📝 Per inviare le email, devi chiamare la funzione attendance-monitor');
      console.log('   Oppure aspetta il prossimo run del cron job.');
    }

  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAttendanceAlerts().catch(console.error);
