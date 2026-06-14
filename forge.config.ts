import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'SyncBooks Desktop',
    executableName: 'syncbooks-desktop',
    asar: true,
    appBundleId: 'com.syncbooks.desktop',
    appCategoryType: 'public.app-category.finance',
    appCopyright: `Copyright © ${new Date().getFullYear()} SyncBooks`,
    icon: './assets/icon', // Electron looks for icon.ico (Win), icon.icns (Mac), icon.png (Linux) automatically
  },
  makers: [
    // Windows & macOS: .zip (portable — extract and run)
    new MakerZIP({}, ['darwin', 'win32', 'linux']),
    // Linux: .deb package (Ubuntu/Debian)
    new MakerDeb({
      options: {
        name: 'syncbooks-desktop',
        productName: 'SyncBooks Desktop',
        genericName: 'Accounting Software',
        description: 'Offline-first accounting software for businesses',
        categories: ['Office', 'Utility'],
        icon: './assets/icon.png',
      },
    }),
  ],
};

export default config;
