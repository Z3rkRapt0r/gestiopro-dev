/**
 * Script per generare icone PWA placeholder
 * In produzione, sostituisci questi placeholder con icone professionali
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');

// SVG template per icona placeholder
const createIconSVG = (size, text) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#1a1a1a"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size / 8}" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
    ${text}
  </text>
  <text x="50%" y="${size * 0.7}" font-family="Arial, sans-serif" font-size="${size / 16}" fill="#888888" text-anchor="middle" dominant-baseline="middle">
    ${size}x${size}
  </text>
</svg>`;

// Crea le icone placeholder
const icons = [
  { name: 'pwa-192x192.png', size: 192, text: 'GP' },
  { name: 'pwa-512x512.png', size: 512, text: 'GP' },
  { name: 'apple-touch-icon.png', size: 180, text: 'GP' },
  { name: 'favicon.ico', size: 32, text: 'G' }
];

console.log('🎨 Generazione icone PWA placeholder...\n');

icons.forEach(icon => {
  const svgContent = createIconSVG(icon.size, icon.text);
  const svgPath = path.join(publicDir, `${icon.name.replace('.png', '').replace('.ico', '')}.svg`);

  fs.writeFileSync(svgPath, svgContent);
  console.log(`✅ Creato: ${icon.name.replace('.png', '').replace('.ico', '')}.svg (${icon.size}x${icon.size})`);
});

console.log('\n📝 Note importanti:');
console.log('1. Le icone SVG sono placeholder temporanei');
console.log('2. Per produzione, usa icone professionali PNG/ICO');
console.log('3. Strumenti consigliati:');
console.log('   - https://www.pwabuilder.com/');
console.log('   - https://realfavicongenerator.net/');
console.log('4. Le icone devono essere:');
console.log('   - pwa-192x192.png (192x192 px)');
console.log('   - pwa-512x512.png (512x512 px)');
console.log('   - apple-touch-icon.png (180x180 px)');
console.log('   - favicon.ico (32x32 px)');
console.log('\n✨ Per ora puoi usare le icone SVG per il testing\n');
