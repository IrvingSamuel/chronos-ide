// @ts-check
// Wrapper that sets THEIA_DEFAULT_PLUGINS before delegating to the
// Theia-generated electron-main entry point.  This ensures that any
// VS Code extensions placed under `plugins/` (e.g. Chronos IDE Utility)
// are loaded as system (built-in) plugins on every startup.

const { resolve } = require('path');

const appRoot = resolve(__dirname, '..');
const pluginsDir = resolve(appRoot, 'plugins');

process.env.THEIA_DEFAULT_PLUGINS = process.env.THEIA_DEFAULT_PLUGINS || `local-dir:${pluginsDir}`;

require('../src-gen/backend/electron-main');
