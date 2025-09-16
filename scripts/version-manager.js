#!/usr/bin/env node

/**
 * GestioPro Version Manager
 * Script per gestire il versioning semantico e aggiornare il changelog
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VersionManager {
    constructor() {
        this.versionFile = path.join(__dirname, '..', 'VERSION');
        this.changelogFile = path.join(__dirname, '..', 'CHANGELOG.md');
        this.packageFile = path.join(__dirname, '..', 'package.json');
    }

    getCurrentVersion() {
        if (fs.existsSync(this.versionFile)) {
            return fs.readFileSync(this.versionFile, 'utf8').trim();
        }
        return '0.0.0';
    }

    parseVersion(version) {
        const [major, minor, patch] = version.split('.').map(Number);
        return { major, minor, patch };
    }

    formatVersion(major, minor, patch) {
        return `${major}.${minor}.${patch}`;
    }

    bumpVersion(type) {
        const current = this.getCurrentVersion();
        const { major, minor, patch } = this.parseVersion(current);

        let newVersion;
        switch (type) {
            case 'major':
                newVersion = this.formatVersion(major + 1, 0, 0);
                break;
            case 'minor':
                newVersion = this.formatVersion(major, minor + 1, 0);
                break;
            case 'patch':
                newVersion = this.formatVersion(major, minor, patch + 1);
                break;
            default:
                throw new Error('Tipo di versione non valido. Usa: major, minor, patch');
        }

        return newVersion;
    }

    updateVersionFile(newVersion) {
        fs.writeFileSync(this.versionFile, newVersion);
        console.log(`✅ VERSION aggiornato a: ${newVersion}`);
    }

    updatePackageJson(newVersion) {
        const packageJson = JSON.parse(fs.readFileSync(this.packageFile, 'utf8'));
        packageJson.version = newVersion;
        fs.writeFileSync(this.packageFile, JSON.stringify(packageJson, null, 2));
        console.log(`✅ package.json aggiornato a: ${newVersion}`);
    }

    addChangelogEntry(version, description, type = 'feat') {
        const today = new Date().toISOString().split('T')[0];
        const emoji = this.getEmojiForType(type);

        const newEntry = `\n## [${version}] - ${today}\n\n### ${emoji} ${description}\n`;

        if (fs.existsSync(this.changelogFile)) {
            let content = fs.readFileSync(this.changelogFile, 'utf8');

            // Trova la posizione dopo l'header della versione corrente
            const currentVersionMatch = content.match(/^## \[(\d+\.\d+\.\d+)\]/m);
            if (currentVersionMatch) {
                const insertPosition = content.indexOf('---', content.indexOf(currentVersionMatch[0])) + 3;
                content = content.slice(0, insertPosition) + newEntry + content.slice(insertPosition);
            } else {
                // Se non trova, aggiunge all'inizio dopo l'header
                const headerEnd = content.indexOf('\n## [', content.indexOf('## [2.')) || content.length;
                content = content.slice(0, headerEnd) + newEntry + content.slice(headerEnd);
            }

            fs.writeFileSync(this.changelogFile, content);
            console.log(`✅ CHANGELOG.md aggiornato con versione ${version}`);
        }
    }

    getEmojiForType(type) {
        const emojis = {
            'feat': '✨',
            'fix': '🐛',
            'docs': '📚',
            'style': '🎨',
            'refactor': '🔧',
            'test': '🧪',
            'chore': '📦',
            'breaking': '🚨'
        };
        return emojis[type] || '✨';
    }

    createGitCommit(version, type) {
        try {
            const commitType = type === 'breaking' ? 'breaking' : type;
            execSync(`git add .`, { stdio: 'inherit' });
            execSync(`git commit -m "${commitType}: release version ${version}"`, { stdio: 'inherit' });
            execSync(`git tag v${version}`, { stdio: 'inherit' });
            console.log(`✅ Commit e tag creati per versione ${version}`);
        } catch (error) {
            console.warn('⚠️  Impossibile creare commit/tag git. Fai manualmente se necessario.');
        }
    }

    release(type, description) {
        console.log(`🚀 Creando nuova versione ${type}...`);

        const newVersion = this.bumpVersion(type);
        console.log(`📈 Versione precedente: ${this.getCurrentVersion()}`);
        console.log(`🎯 Nuova versione: ${newVersion}`);

        // Aggiorna file
        this.updateVersionFile(newVersion);
        this.updatePackageJson(newVersion);

        // Aggiungi al changelog se fornita descrizione
        if (description) {
            this.addChangelogEntry(newVersion, description, type);
        }

        // Crea commit e tag
        this.createGitCommit(newVersion, type);

        console.log(`\n🎉 Versione ${newVersion} creata con successo!`);
        console.log(`📋 Ricorda di aggiornare il CHANGELOG.md manualmente se necessario.`);
    }

    showUsage() {
        console.log(`
🎯 GestioPro Version Manager

Utilizzo:
  node scripts/version-manager.js <tipo> "<descrizione>"

Tipi disponibili:
  major    - Cambiamenti breaking (1.0.0 → 2.0.0)
  minor    - Nuove funzionalità (1.0.0 → 1.1.0)
  patch    - Bug fix (1.0.0 → 1.0.1)

Esempi:
  node scripts/version-manager.js minor "Aggiunto sistema notifiche push"
  node scripts/version-manager.js patch "Corretto bug validazione form"
  node scripts/version-manager.js major "Ristrutturazione completa API"

Comandi npm disponibili:
  npm run version:patch   - Incrementa patch version
  npm run version:minor   - Incrementa minor version
  npm run version:major   - Incrementa major version
  npm run release        - Build + version + tag + push
        `);
    }
}

// Esecuzione script
const args = process.argv.slice(2);
const versionManager = new VersionManager();

if (args.length === 0) {
    versionManager.showUsage();
} else if (args.length === 1) {
    // Solo tipo versione
    versionManager.release(args[0], null);
} else {
    // Tipo + descrizione
    versionManager.release(args[0], args.slice(1).join(' '));
}
