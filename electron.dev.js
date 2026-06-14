/**
 * Development entry point for Electron.
 * Registers tsx for TypeScript transpilation, then loads the main process.
 */
require('tsx/cjs');
require('./src/main/index.ts');
