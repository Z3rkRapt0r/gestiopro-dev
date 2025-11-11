import { readFileSync } from 'fs';

const typesFile = readFileSync('./src/integrations/supabase/types.ts', 'utf-8');

// Trova tutte le tabelle (cerca pattern: nome_tabella: { seguito da Row:)
const tableMatches = typesFile.match(/^\s+([a-z_]+):\s*\{\s*\n\s+Row:/gm);
const tableNames = tableMatches ? tableMatches.map(m => m.match(/([a-z_]+):/)[1]) : [];

// Trova tutte le views (nella sezione Views)
const viewsSectionMatch = typesFile.match(/Views:\s*\{([\s\S]*?)^\s+\}\s*$/m);
const viewsSection = viewsSectionMatch ? viewsSectionMatch[1] : '';
const viewMatches = viewsSection.match(/^\s+([a-z_]+):\s*\{\s*\n\s+Row:/gm);
const viewNames = viewMatches ? viewMatches.map(m => m.match(/([a-z_]+):/)[1]) : [];

// Trova tutte le funzioni (nella sezione Functions)
const functionsSectionMatch = typesFile.match(/Functions:\s*\{([\s\S]*?)^\s+\}\s*$/m);
const functionsSection = functionsSectionMatch ? functionsSectionMatch[1] : '';
const functionMatches = functionsSection.match(/^\s+([a-z_]+):\s*\{/gm);
const functionNames = functionMatches ? functionMatches.map(m => m.match(/([a-z_]+):/)[1]) : [];

console.log('\n📊 ANALISI DATABASE SUPABASE\n');
console.log('━'.repeat(60));

console.log(`\n📋 TABELLE (${tableNames.length}):\n`);
tableNames.forEach((name, index) => {
  console.log(`   ${(index + 1).toString().padStart(2)}. ${name}`);
});

console.log(`\n👁️  VIEWS (${viewNames.length}):\n`);
viewNames.forEach((name, index) => {
  console.log(`   ${(index + 1).toString().padStart(2)}. ${name}`);
});

console.log(`\n⚙️  FUNZIONI (${functionNames.length}):\n`);
functionNames.forEach((name, index) => {
  console.log(`   ${(index + 1).toString().padStart(2)}. ${name}`);
});

console.log('\n' + '━'.repeat(60));
console.log('\n✨ RIEPILOGO:');
console.log(`   📋 Tabelle:   ${tableNames.length}`);
console.log(`   👁️  Views:     ${viewNames.length}`);
console.log(`   ⚙️  Funzioni:  ${functionNames.length}`);
console.log(`   📦 TOTALE:    ${tableNames.length + viewNames.length + functionNames.length}`);
console.log('\n' + '━'.repeat(60) + '\n');

// Informazioni su Prisma
console.log('🔧 MODELLI PRISMA DISPONIBILI:');
console.log(`   Ho creato ${tableNames.length} modelli Prisma corrispondenti alle tabelle.`);
console.log(`   ⚠️  Note: Views e Functions non sono mappate in Prisma.\n`);
