#!/usr/bin/env node

/**
 * Auto Release Manager - GestioPro
 * Sistema automatico per gestire rilasci e aggiornamenti documentazione
 *
 * Esegue automaticamente:
 * - Analisi commit per determinare tipo versione
 * - Aggiornamento CHANGELOG.md
 * - Incremento versione
 * - Creazione tag Git
 * - Aggiornamento documentazione
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class AutoReleaseManager {
    constructor() {
        this.versionFile = path.join(__dirname, '..', 'VERSION');
        this.changelogFile = path.join(__dirname, '..', 'CHANGELOG.md');
        this.packageFile = path.join(__dirname, '..', 'package.json');
        this.readmeFile = path.join(__dirname, '..', 'README.md');
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

    getLastCommitMessage() {
        try {
            return execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
        } catch (error) {
            return '';
        }
    }

    getRecentCommits(since = 'HEAD~10') {
        try {
            const commits = execSync(`git log --oneline ${since}..HEAD`, { encoding: 'utf8' })
                .trim()
                .split('\n')
                .filter(line => line.length > 0);
            return commits;
        } catch (error) {
            return [];
        }
    }

    analyzeCommitsForVersionType(commits) {
        let hasBreakingChanges = false;
        let hasNewFeatures = false;
        let hasBugFixes = false;
        let hasDocumentation = false;

        const conventionalCommits = {
            feat: 'minor',
            fix: 'patch',
            docs: 'patch',
            style: 'patch',
            refactor: 'patch',
            test: 'patch',
            chore: 'patch',
            perf: 'patch',
            ci: 'patch',
            build: 'patch',
            breaking: 'major'
        };

        for (const commit of commits) {
            const message = commit.toLowerCase();

            // Check for breaking changes
            if (message.includes('breaking') || message.includes('!:')) {
                hasBreakingChanges = true;
            }

            // Check conventional commits
            for (const [type, versionType] of Object.entries(conventionalCommits)) {
                if (message.startsWith(`${type}:`) || message.startsWith(`${type}(`)) {
                    if (versionType === 'major') hasBreakingChanges = true;
                    if (versionType === 'minor') hasNewFeatures = true;
                    if (versionType === 'patch') hasBugFixes = true;
                    if (type === 'docs') hasDocumentation = true;
                }
            }

            // Check keywords
            if (message.includes('add') || message.includes('new') || message.includes('implement')) {
                hasNewFeatures = true;
            }
            if (message.includes('fix') || message.includes('bug') || message.includes('error')) {
                hasBugFixes = true;
            }
        }

        // Determine version type
        if (hasBreakingChanges) return 'major';
        if (hasNewFeatures) return 'minor';
        if (hasBugFixes || hasDocumentation) return 'patch';

        return 'patch'; // Default to patch
    }

    generateChangelogEntries(commits, newVersion) {
        const today = new Date().toISOString().split('T')[0];
        const entries = {
            features: [],
            fixes: [],
            docs: [],
            other: []
        };

        for (const commit of commits) {
            const message = commit.replace(/^[a-f0-9]+\s/, ''); // Remove hash

            if (message.toLowerCase().includes('feat') || message.toLowerCase().includes('add') || message.toLowerCase().includes('new')) {
                entries.features.push(message);
            } else if (message.toLowerCase().includes('fix') || message.toLowerCase().includes('bug')) {
                entries.fixes.push(message);
            } else if (message.toLowerCase().includes('docs') || message.toLowerCase().includes('readme') || message.toLowerCase().includes('changelog')) {
                entries.docs.push(message);
            } else {
                entries.other.push(message);
            }
        }

        let changelogContent = `\n## [${newVersion}] - ${today}\n`;

        if (entries.features.length > 0) {
            changelogContent += `\n### ✨ Nuove Funzionalità\n`;
            entries.features.forEach(feature => {
                changelogContent += `- ${feature}\n`;
            });
        }

        if (entries.fixes.length > 0) {
            changelogContent += `\n### 🐛 Correzioni\n`;
            entries.fixes.forEach(fix => {
                changelogContent += `- ${fix}\n`;
            });
        }

        if (entries.docs.length > 0) {
            changelogContent += `\n### 📚 Documentazione\n`;
            entries.docs.forEach(doc => {
                changelogContent += `- ${doc}\n`;
            });
        }

        if (entries.other.length > 0) {
            changelogContent += `\n### 🔧 Miglioramenti\n`;
            entries.other.forEach(other => {
                changelogContent += `- ${other}\n`;
            });
        }

        return changelogContent;
    }

    updateChangelog(newVersion, changelogContent) {
        if (fs.existsSync(this.changelogFile)) {
            let content = fs.readFileSync(this.changelogFile, 'utf8');

            // Find the position after current version header
            const currentVersionMatch = content.match(/^## \[(\d+\.\d+\.\d+)\]/m);
            if (currentVersionMatch) {
                const insertPosition = content.indexOf('---', content.indexOf(currentVersionMatch[0])) + 3;
                content = content.slice(0, insertPosition) + changelogContent + '\n---' + content.slice(insertPosition);
            }

            fs.writeFileSync(this.changelogFile, content);
            console.log(`✅ CHANGELOG.md aggiornato con versione ${newVersion}`);
        }
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

    updateReadmeVersion(newVersion) {
        if (fs.existsSync(this.readmeFile)) {
            let content = fs.readFileSync(this.readmeFile, 'utf8');
            content = content.replace(/GestioPro v\d+\.\d+\.\d+/g, `GestioPro v${newVersion}`);
            fs.writeFileSync(this.readmeFile, content);
            console.log(`✅ README.md aggiornato con versione ${newVersion}`);
        }
    }

    createGitTag(version) {
        try {
            execSync(`git tag v${version}`, { stdio: 'inherit' });
            console.log(`✅ Tag Git v${version} creato`);
        } catch (error) {
            console.warn(`⚠️ Impossibile creare tag Git: ${error.message}`);
        }
    }

    runPreReleaseChecks() {
        console.log('🔍 Eseguendo controlli pre-rilascio...');

        try {
            // Check if there are uncommitted changes
            const status = execSync('git status --porcelain', { encoding: 'utf8' });
            if (status.trim()) {
                console.warn('⚠️ Ci sono modifiche non committate. Considera di committarle prima del rilascio.');
            }

            // Check if we're on main branch
            const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
            if (branch !== 'main') {
                console.warn(`⚠️ Non sei sul branch main (sei su: ${branch}). Considera di fare merge prima del rilascio.`);
            }

            console.log('✅ Controlli pre-rilascio completati');
        } catch (error) {
            console.warn('⚠️ Errore durante i controlli pre-rilascio:', error.message);
        }
    }

    autoRelease() {
        console.log('🚀 Avvio Auto Release Manager...\n');

        // Run pre-release checks
        this.runPreReleaseChecks();

        // Get recent commits since last version
        const recentCommits = this.getRecentCommits('HEAD~20'); // Last 20 commits
        console.log(`📝 Analizzati ${recentCommits.length} commit recenti`);

        if (recentCommits.length === 0) {
            console.log('ℹ️ Nessun nuovo commit da rilasciare');
            return;
        }

        // Analyze commits to determine version type
        const versionType = this.analyzeCommitsForVersionType(recentCommits);
        console.log(`🎯 Tipo versione determinato: ${versionType}`);

        // Calculate new version
        const currentVersion = this.getCurrentVersion();
        const { major, minor, patch } = this.parseVersion(currentVersion);

        let newVersion;
        switch (versionType) {
            case 'major':
                newVersion = this.formatVersion(major + 1, 0, 0);
                break;
            case 'minor':
                newVersion = this.formatVersion(major, minor + 1, 0);
                break;
            case 'patch':
                newVersion = this.formatVersion(major, minor, patch + 1);
                break;
        }

        console.log(`📈 Versione: ${currentVersion} → ${newVersion}`);

        // Generate changelog
        const changelogContent = this.generateChangelogEntries(recentCommits, newVersion);

        // Update files
        this.updateVersionFile(newVersion);
        this.updatePackageJson(newVersion);
        this.updateReadmeVersion(newVersion);
        this.updateChangelog(newVersion, changelogContent);

        // Create git tag
        this.createGitTag(newVersion);

        console.log(`\n🎉 Rilascio automatico completato!`);
        console.log(`📋 Versione ${newVersion} creata e documentata`);
        console.log(`🔄 Ricorda di fare push: git push origin main --tags`);
    }

    showUsage() {
        console.log(`
🎯 GestioPro Auto Release Manager

Utilizzo:
  node scripts/auto-release.js

Cosa fa automaticamente:
  ✅ Analizza gli ultimi commit per determinare il tipo di versione
  ✅ Aggiorna VERSION e package.json
  ✅ Genera e aggiorna CHANGELOG.md
  ✅ Aggiorna README.md con nuova versione
  ✅ Crea tag Git appropriato

Tipi di versione automatici:
  🔴 MAJOR - Commit con "breaking" o "!:"
  🟡 MINOR - Commit con "feat:" o nuove funzionalità
  🟢 PATCH - Commit con "fix:", "docs:", o altri

Esempio output:
  📝 Analizzati 5 commit recenti
  🎯 Tipo versione determinato: minor
  📈 Versione: 2.1.0 → 2.2.0
  ✅ File aggiornati automaticamente
  ✅ Tag Git creato

⚠️  IMPORTANTE:
- Esegui su branch main con working directory pulito
- Fai push manuale dopo: git push origin main --tags
- Verifica CHANGELOG.md prima del push
        `);
    }
}

// Esecuzione script
const args = process.argv.slice(2);
const autoRelease = new AutoReleaseManager();

if (args.length === 0) {
    autoRelease.autoRelease();
} else if (args.includes('--help') || args.includes('-h')) {
    autoRelease.showUsage();
} else {
    console.log('❌ Uso: node scripts/auto-release.js [--help]');
    process.exit(1);
}
