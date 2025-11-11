#!/usr/bin/env node

/**
 * Script to check email templates in the database
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function checkEmailTemplates() {
  console.log('🔍 Verificando template email nel database...\n');

  try {
    const templates = await prisma.$queryRaw`
      SELECT
        id,
        admin_id,
        template_type,
        template_category,
        name,
        subject,
        LENGTH(content) as content_length,
        SUBSTRING(content, 1, 200) as content_preview,
        primary_color,
        secondary_color,
        background_color,
        text_color,
        footer_text,
        footer_color,
        font_family,
        button_color,
        button_text_color,
        border_radius,
        created_at
      FROM email_templates
      ORDER BY template_category, template_type
    `;

    if (!templates || templates.length === 0) {
      console.log('❌ Nessun template trovato nel database\n');
      return;
    }

    console.log(`📊 Trovati ${templates.length} template:\n`);

    templates.forEach((t, index) => {
      console.log(`${index + 1}. ${t.name}`);
      console.log(`   Tipo: ${t.template_type}`);
      console.log(`   Categoria: ${t.template_category}`);
      console.log(`   Subject: ${t.subject || 'N/A'}`);
      console.log(`   Content Length: ${t.content_length || 0} caratteri`);
      if (t.content_preview) {
        console.log(`   Content Preview: ${t.content_preview.substring(0, 100)}...`);
      }
      console.log(`   Colori:`);
      console.log(`     - Primary: ${t.primary_color || 'default'}`);
      console.log(`     - Background: ${t.background_color || 'default'}`);
      console.log(`     - Text: ${t.text_color || 'default'}`);
      console.log(`   Font: ${t.font_family || 'default'}`);
      console.log(`   Footer: ${t.footer_text ? 'Sì' : 'No'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmailTemplates().catch(console.error);
