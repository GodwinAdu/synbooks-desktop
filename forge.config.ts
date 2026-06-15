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
  },
  makers: [
    // All platforms: ZIP (most reliable without code signing)
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
