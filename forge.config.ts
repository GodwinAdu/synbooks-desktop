import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
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
    // Windows: Squirrel installer (.exe setup)
    new MakerSquirrel({
      name: 'SyncBooksDesktop',
      authors: 'SyncBooks',
      description: 'SyncBooks Desktop - Offline Accounting Software',
    }),
    // macOS: ZIP (user extracts the .app)
    new MakerZIP({}, ['darwin']),
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
