// Garante que módulos backend exigidos pelo server.js mas omitidos pelo
// empacotador (yarn workspaces) entrem no app.asar.
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');

/** Pacotes que o Theia gera em server.js mas o electron-builder pode omitir. */
const BACKEND_MODULES = ['@theia/test'];

module.exports = async function afterPack(context) {
    const asarPath = path.join(context.appOutDir, 'resources', 'app.asar');
    if (!await fs.pathExists(asarPath)) {
        return;
    }

    const missing = [];
    for (const mod of BACKEND_MODULES) {
        const rel = `node_modules/${mod.replace('@', '')}`.replace('/', '/');
        // mod like @theia/test -> node_modules/@theia/test
        const relPath = path.join('node_modules', ...mod.split('/'));
        const listed = execSync(`npx asar list "${asarPath}"`, { encoding: 'utf8' });
        if (!listed.includes(`/${relPath}/`)) {
            missing.push(mod);
        }
    }
    if (missing.length === 0) {
        return;
    }

    const work = path.join(context.appOutDir, '.asar-patch');
    const extracted = path.join(work, 'app');
    await fs.remove(work);
    await fs.ensureDir(extracted);
    execSync(`npx asar extract "${asarPath}" "${extracted}"`, { stdio: 'inherit' });

    for (const mod of missing) {
        const src = path.join(ROOT, 'node_modules', ...mod.split('/'));
        const dest = path.join(extracted, 'node_modules', ...mod.split('/'));
        if (!await fs.pathExists(src)) {
            throw new Error(`afterPack: módulo ausente no monorepo: ${mod} (${src})`);
        }
        await fs.copy(src, dest);
        console.log(`afterPack: injetado ${mod} no app.asar`);
    }

    await fs.remove(asarPath);
    execSync(`npx asar pack "${extracted}" "${asarPath}"`, { stdio: 'inherit' });
    await fs.remove(work);
};
