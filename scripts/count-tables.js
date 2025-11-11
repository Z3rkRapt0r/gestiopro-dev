import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function countTables() {
  try {
    console.log('Connessione al database in corso...\n');

    // Prova a fare una query semplice per verificare la connessione
    await prisma.$connect();
    console.log('✅ Connessione al database riuscita!\n');

    // Query per ottenere tutte le tabelle dal database
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log(`📊 Totale tabelle nel database: ${tables.length}\n`);
    console.log('📋 Lista tabelle:\n');

    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });

    // Ottieni anche le views
    const views = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    if (views.length > 0) {
      console.log(`\n👁️  Totale views: ${views.length}\n`);
      views.forEach((view, index) => {
        console.log(`${index + 1}. ${view.table_name}`);
      });
    }

    // Ottieni funzioni/stored procedures
    const functions = await prisma.$queryRaw`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name;
    `;

    if (functions.length > 0) {
      console.log(`\n⚙️  Totale funzioni: ${functions.length}\n`);
    }

    console.log('\n✨ Riepilogo:');
    console.log(`   - Tabelle: ${tables.length}`);
    console.log(`   - Views: ${views.length}`);
    console.log(`   - Funzioni: ${functions.length}`);
    console.log(`   - Totale oggetti: ${tables.length + views.length + functions.length}`);

  } catch (error) {
    console.error('❌ Errore durante la connessione al database:');
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

countTables();
