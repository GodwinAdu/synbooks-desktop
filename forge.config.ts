import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'SyncBooks Desktop',
    executableName: 'syncbooks-desktop',
    asar: true,
    icon: './assets/icon',
    appBundleId: 'com.syncbooks.desktop',
    appCategoryType: 'public.app-category.finance',
    appCopyright: `Copyright © ${new Date().getFullYear()} SyncBooks`,
    extraResource: ['./node_modules/sql.js/dist/sql-wasm.wasm'],
  },
  makers: [
    // Windows: Squirrel installer (.exe) — installs to AppData, auto-updates support
    new MakerSquirrel({
      name: 'SyncBooksDesktop',
      setupExe: 'SyncBooks-Desktop-Setup.exe',
      setupIcon: './assets/icon.ico',
      noMsi: true,
    }),
    // All platforms: ZIP (fallback / portable)
    new MakerZIP({}, ['win32', 'darwin']),
    // Linux: .deb package
    new MakerDeb({
      options: {
        name: 'syncbooks-desktop',
        productName: 'SyncBooks Desktop',
        genericName: 'Accounting Software',
        description: 'Offline-first accounting software for businesses',
        categories: ['Office', 'Utility'],
      },
    }),
  ],
};

export default config;
