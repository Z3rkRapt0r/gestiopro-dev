import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function testRead() {
  try {
    console.log('\n🧪 TEST LETTURA DATABASE CON PRISMA\n');
    console.log('━'.repeat(60));

    // Test 1: Contare i profili
    const profilesCount = await prisma.profiles.count();
    console.log(`\n✅ Test 1: Profili totali: ${profilesCount}`);

    // Test 2: Contare le presenze
    const attendancesCount = await prisma.attendances.count();
    console.log(`✅ Test 2: Presenze totali: ${attendancesCount}`);

    // Test 3: Contare gli straordinari
    const overtimeCount = await prisma.overtime_records.count();
    console.log(`✅ Test 3: Straordinari totali: ${overtimeCount}`);

    // Test 4: Contare le richieste di ferie
    const leaveRequestsCount = await prisma.leave_requests.count();
    console.log(`✅ Test 4: Richieste ferie totali: ${leaveRequestsCount}`);

    // Test 5: Contare i documenti
    const documentsCount = await prisma.documents.count();
    console.log(`✅ Test 5: Documenti totali: ${documentsCount}`);

    // Test 6: Contare le notifiche
    const notificationsCount = await prisma.notifications.count();
    console.log(`✅ Test 6: Notifiche totali: ${notificationsCount}`);

    // Test 7: Query con relazioni - Primo profilo con le sue presenze
    const firstProfile = await prisma.profiles.findFirst({
      include: {
        attendances: {
          take: 1,
          orderBy: { date: 'desc' }
        },
        overtime_records: {
          take: 1,
          orderBy: { date: 'desc' }
        }
      }
    });

    if (firstProfile) {
      console.log(`\n✅ Test 7: Query con relazioni`);
      console.log(`   Nome: ${firstProfile.first_name} ${firstProfile.last_name}`);
      console.log(`   Email: ${firstProfile.email}`);
      console.log(`   Ruolo: ${firstProfile.role}`);
      console.log(`   Presenze: ${firstProfile.attendances.length}`);
      console.log(`   Straordinari: ${firstProfile.overtime_records.length}`);
    }

    // Test 8: Query aggregata
    const overtimeStats = await prisma.overtime_records.aggregate({
      _sum: {
        hours: true
      },
      _avg: {
        hours: true
      },
      _count: true
    });

    console.log(`\n✅ Test 8: Query aggregata su straordinari`);
    console.log(`   Totale ore: ${overtimeStats._sum.hours || 0}`);
    console.log(`   Media ore: ${overtimeStats._avg.hours ? overtimeStats._avg.hours.toFixed(2) : 0}`);
    console.log(`   Numero record: ${overtimeStats._count}`);

    console.log('\n' + '━'.repeat(60));
    console.log('\n🎉 TUTTI I TEST COMPLETATI CON SUCCESSO!');
    console.log('✨ Prisma può leggere il database senza problemi!\n');

  } catch (error) {
    console.error('\n❌ Errore durante i test:');
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRead();
