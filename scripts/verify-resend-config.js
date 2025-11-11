#!/usr/bin/env node

/**
 * Script to verify Resend API configuration in the database
 *
 * This checks if:
 * 1. admin_settings table has resend_api_key
 * 2. sender_email is configured
 * 3. sender_name is configured
 * 4. The API key format looks valid
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function verifyResendConfig() {
  console.log('🔍 Verificando configurazione Resend nel database...\n');

  try {
    // Get all admin settings
    const adminSettings = await prisma.$queryRaw`
      SELECT
        admin_id,
        CASE
          WHEN resend_api_key IS NOT NULL AND resend_api_key != '' THEN '✅ Configurata'
          ELSE '❌ Mancante'
        END as resend_key_status,
        CASE
          WHEN resend_api_key IS NOT NULL AND resend_api_key != ''
          THEN CONCAT(SUBSTRING(resend_api_key, 1, 7), '...', SUBSTRING(resend_api_key, LENGTH(resend_api_key) - 3, 4))
          ELSE NULL
        END as resend_key_preview,
        sender_email,
        sender_name,
        reply_to
      FROM admin_settings
    `;

    if (!adminSettings || adminSettings.length === 0) {
      console.log('❌ Nessuna configurazione admin trovata nella tabella admin_settings\n');
      console.log('📝 Devi configurare Resend nelle Impostazioni Admin prima di poter inviare email di test.\n');
      return;
    }

    console.log('📊 Configurazioni Admin trovate:\n');

    adminSettings.forEach((setting, index) => {
      console.log(`Admin ${index + 1}:`);
      console.log(`  Admin ID: ${setting.admin_id}`);
      console.log(`  Resend API Key: ${setting.resend_key_status}`);
      if (setting.resend_key_preview) {
        console.log(`  Preview chiave: ${setting.resend_key_preview}`);
      }
      console.log(`  Sender Email: ${setting.sender_email || '❌ Non configurata'}`);
      console.log(`  Sender Name: ${setting.sender_name || '❌ Non configurato'}`);
      console.log(`  Reply To: ${setting.reply_to || '⚠️  Non configurato (opzionale)'}`);
      console.log('');
    });

    // Check if any admin has complete configuration
    const hasCompleteConfig = adminSettings.some(s =>
      s.resend_key_status === '✅ Configurata' &&
      s.sender_email &&
      s.sender_name
    );

    if (hasCompleteConfig) {
      console.log('✅ CONFIGURAZIONE COMPLETA - La funzione di test email dovrebbe funzionare\n');
      console.log('📧 Prossimi passi:');
      console.log('1. Verifica che il dominio sia verificato in Resend (https://resend.com/domains)');
      console.log('2. Oppure usa onboarding@resend.dev come sender_email per i test');
      console.log('3. Assicurati che la Edge Function sia deployata (vedi DEPLOY_EDGE_FUNCTION.md)');
    } else {
      console.log('⚠️  CONFIGURAZIONE INCOMPLETA\n');
      console.log('📝 Vai su Impostazioni → Configurazione Email e completa:');
      console.log('   - Resend API Key (ottienila da https://resend.com/api-keys)');
      console.log('   - Email mittente (deve essere verificata in Resend)');
      console.log('   - Nome mittente');
    }

    // Check if resend_api_key column exists
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'admin_settings'
      AND column_name = 'resend_api_key'
    `;

    if (!columnCheck || columnCheck.length === 0) {
      console.log('\n❌ ERRORE: La colonna resend_api_key non esiste nella tabella admin_settings!');
      console.log('📝 Devi eseguire una migration per aggiungere questa colonna.\n');
      console.log('Comando: npx prisma migrate dev\n');
    }

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error.message);

    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('\n💡 Sembra che la colonna resend_api_key non esista.');
      console.log('📝 Verifica lo schema del database e assicurati di aver eseguito tutte le migration.\n');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
verifyResendConfig().catch((error) => {
  console.error('Errore fatale:', error);
  process.exit(1);
});
