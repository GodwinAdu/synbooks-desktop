/**
 * SyncBooks Desktop - Electron Main Process
 * 
 * This is the entry point for the desktop app. It:
 * 1. Creates the main browser window
 * 2. Starts the embedded Express API server (local)
 * 3. Initializes the SQLite database
 * 4. Manages the sync engine for online/offline transitions
 * 5. Handles system tray, auto-updates, and app lifecycle
 */

import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } from 'electron';
import path from 'path';

// Handle Squirrel Windows startup events (install/uninstall/update)
// This MUST be the first thing that runs
if (require('electron-squirrel-startup')) app.quit();

// ─── Single Instance Lock ─────────────────────────────────────────────────
// Prevent multiple instances (which causes port conflict on 45678)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // Another instance is already running — quit this one
  app.quit();
} else {
  // This is the first instance — handle second-instance events
  app.on('second-instance', () => {
    // Someone tried to run a second instance — show our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

import { startLocalServer, stopLocalServer } from './server';
import { initializeDatabase } from './database';
import { SyncEngine } from './sync/sync-engine';
import { startScheduler, stopScheduler } from './jobs/scheduler';
import { startTrial } from './licensing/license-manager';
import log from 'electron-log';

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let syncEngine: SyncEngine | null = null;

const LOCAL_SERVER_PORT = 45678;
const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  const preloadPath = path.join(app.getAppPath(), 'preload.js');
  log.info('Preload path:', preloadPath);
  log.info('Preload exists:', require('fs').existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'SyncBooks Desktop',
    icon: path.join(app.getAppPath(), 'assets', 'icon.png'),
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: true, // Always allow DevTools for debugging
    },
    show: false,
    titleBarStyle: 'default',
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the renderer
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the local Express server (avoids file:// ES module issues)
    const serverUrl = `http://127.0.0.1:${LOCAL_SERVER_PORT}`;
    log.info('Loading renderer from server:', serverUrl);
    
    await mainWindow.loadURL(serverUrl);

    // Handle refresh/navigation — SPA routing handled server-side (catch-all)
    mainWindow.webContents.on('did-fail-load', (_event, _code, _desc, _url, isMainFrame) => {
      if (isMainFrame) {
        log.info('did-fail-load: retrying server URL');
        setTimeout(() => mainWindow?.loadURL(serverUrl), 1000);
      }
    });
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // On all platforms: closing the window quits the app
  // (Tray is just a bonus for quick access, not required)
  mainWindow.on('close', () => {
    (app as any).isQuitting = true;
  });
}

/** Show an error page when the app can't start properly */
async function showErrorPage(message: string) {
  if (!mainWindow) return;
  const html = `
    <html>
      <head><title>SyncBooks Desktop - Error</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; background: #1a1a2e; color: #eee;">
        <h1 style="color: #f97316;">⚠️ SyncBooks Desktop Failed to Start</h1>
        <p>The application encountered an error during startup:</p>
        <pre style="background: #0f0f23; padding: 16px; border-radius: 8px; overflow: auto; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${message.replace(/</g, '&lt;')}</pre>
        <p style="margin-top: 24px; color: #888;">
          <strong>What to try:</strong><br>
          1. Close and reopen the app<br>
          2. Check if another instance is running (port 45678)<br>
          3. Check logs at: ${app.getPath('userData')}/logs/<br>
          4. Delete database and restart: ${path.join(app.getPath('userData'), 'syncbooks.db')}<br>
          5. Report this issue on GitHub
        </p>
        <p style="margin-top: 16px; color: #666; font-size: 12px;">Version: ${app.getVersion()} | Platform: ${process.platform} | Arch: ${process.arch}</p>
      </body>
    </html>
  `;
  await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  mainWindow.show();
}

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  tray = new Tray(nativeImage.createEmpty());

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open SyncBooks',
      click: () => mainWindow?.show(),
    },
    {
      label: 'Sync Now',
      click: () => syncEngine?.syncAll(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('SyncBooks Desktop');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow?.show());
}

function setupIPC() {
  // Database path
  ipcMain.handle('get-db-path', () => {
    return path.join(app.getPath('userData'), 'syncbooks.db');
  });

  // Print the current page
  ipcMain.handle('print-page', () => {
    if (mainWindow) {
      mainWindow.webContents.print({ silent: false, printBackground: true });
    }
  });

  // Print to PDF — loads the print-preview page in a hidden window, generates PDF, saves to Downloads
  ipcMain.handle('print-to-pdf', async () => {
    try {
      const { BrowserWindow: BW } = require('electron');
      const printWin = new BW({ show: false, width: 794, height: 1123 }); // A4 size in px
      await printWin.loadURL(`http://127.0.0.1:${LOCAL_SERVER_PORT}/print-preview`);
      
      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pdfBuffer = await printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      });
      
      printWin.close();
      
      // Save to Downloads folder
      const downloadsPath = app.getPath('downloads');
      const fileName = `Invoice-${Date.now()}.pdf`;
      const filePath = path.join(downloadsPath, fileName);
      require('fs').writeFileSync(filePath, pdfBuffer);
      
      // Open the file in the default PDF viewer
      const { shell } = require('electron');
      shell.openPath(filePath);
      
      return { success: true, path: filePath };
    } catch (err: any) {
      log.error('printToPDF failed:', err);
      return { success: false, error: err.message };
    }
  });

  // Sync status
  ipcMain.handle('sync:status', () => {
    return syncEngine?.getStatus() ?? { connected: false, lastSyncedAt: null, pendingChanges: 0, syncing: false, lastError: null, mode: 'disconnected' };
  });

  // Trigger manual sync
  ipcMain.handle('sync:trigger', async () => {
    return syncEngine?.syncAll();
  });

  // Connect to cloud (authenticate)
  ipcMain.handle('sync:connect', async (_event, { cloudApiUrl, email, password }: { cloudApiUrl: string; email: string; password: string }) => {
    return syncEngine?.authenticate(cloudApiUrl, email, password);
  });

  // Disconnect from cloud
  ipcMain.handle('sync:disconnect', () => {
    syncEngine?.disconnect();
    return { success: true };
  });

  // Initial full sync (pull everything from cloud)
  ipcMain.handle('sync:initial', async () => {
    return syncEngine?.initialSync();
  });

  // Check if sync is configured
  ipcMain.handle('sync:is-configured', () => {
    return syncEngine?.isConfigured() ?? false;
  });

  // App info
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    dataPath: app.getPath('userData'),
    platform: process.platform,
  }));

  // Online status change from renderer
  ipcMain.on('network:status', (_event, isOnline: boolean) => {
    if (isOnline) {
      log.info('Network: Online - triggering sync');
      syncEngine?.setOnlineStatus(true);
    } else {
      log.info('Network: Offline - pausing sync');
      syncEngine?.setOnlineStatus(false);
    }
  });
}

async function bootstrap() {
  try {
    log.info('Starting SyncBooks Desktop...');
    log.info('App path:', app.getAppPath());
    log.info('User data:', app.getPath('userData'));
    log.info('Platform:', process.platform, process.arch);

    // 1. Initialize the local SQLite database
    const dbPath = path.join(app.getPath('userData'), 'syncbooks.db');
    await initializeDatabase(dbPath);
    log.info('Database initialized at:', dbPath);

    // 2. Start the embedded Express API server
    await startLocalServer(LOCAL_SERVER_PORT);
    log.info(`Local API server running on port ${LOCAL_SERVER_PORT}`);

    // 2.5 Start trial period if first launch
    startTrial();

    // 3. Initialize sync engine
    syncEngine = new SyncEngine();
    await syncEngine.initialize();
    log.info('Sync engine initialized');

    // 4. Start background job scheduler
    startScheduler();
    log.info('Job scheduler started');

    // 5. Create the app window
    await createWindow();
    createTray();
    setupIPC();

    log.info('SyncBooks Desktop started successfully');

    // 6. Auto-updater (checks for updates from GitHub releases)
    if (!isDev) {
      try {
        const { autoUpdater } = require('electron-updater');
        autoUpdater.logger = log;
        autoUpdater.autoDownload = false; // Don't auto-download, just notify

        autoUpdater.on('update-available', (info: any) => {
          log.info('Update available:', info.version);
          if (mainWindow) {
            mainWindow.webContents.send('update-available', { version: info.version, releaseNotes: info.releaseNotes });
          }
        });

        autoUpdater.on('update-downloaded', (info: any) => {
          log.info('Update downloaded:', info.version);
          if (mainWindow) {
            mainWindow.webContents.send('update-downloaded', { version: info.version });
          }
        });

        autoUpdater.on('error', (err: any) => {
          log.error('Auto-updater error:', err?.message || err);
        });

        // Check for updates 10 seconds after startup
        setTimeout(() => {
          autoUpdater.checkForUpdates().catch((err: any) => {
            log.warn('Update check failed (offline?):', err?.message);
          });
        }, 10000);

        // IPC: User requests to download & install update
        ipcMain.on('download-update', () => {
          autoUpdater.downloadUpdate().catch((err: any) => log.error('Download update failed:', err));
        });
        ipcMain.on('install-update', () => {
          autoUpdater.quitAndInstall(false, true);
        });
      } catch (err: any) {
        log.warn('Auto-updater not available:', err?.message);
      }
    }
  } catch (error: any) {
    log.error('Failed to start app:', error);
    // Don't just quit — show error to user
    try {
      if (!mainWindow) {
        mainWindow = new BrowserWindow({ width: 800, height: 600, show: true });
      }
      await showErrorPage(`Startup failed: ${error.message}\n\nStack: ${error.stack || 'No stack trace'}`);
    } catch {
      // If even that fails, just quit
      app.quit();
    }
  }
}

// App lifecycle
app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});

app.on('before-quit', async () => {
  log.info('App shutting down...');
  stopScheduler();
  await syncEngine?.shutdown();
  stopLocalServer();
});
