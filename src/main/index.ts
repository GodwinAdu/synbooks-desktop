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
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: isDev, // Disable DevTools in production
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
    // In production, find the renderer relative to the app root
    const rendererPath = path.join(app.getAppPath(), 'dist', 'renderer', 'index.html');
    log.info('Loading renderer from:', rendererPath);
    log.info('File exists:', require('fs').existsSync(rendererPath));
    
    await mainWindow.loadFile(rendererPath);

    // Handle refresh/navigation — always serve index.html for SPA routing
    mainWindow.webContents.on('did-fail-load', () => {
      mainWindow?.loadFile(rendererPath);
    });

    // Block DevTools shortcuts in production
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
        event.preventDefault();
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

  // macOS: close actually closes (no tray behavior)
  // Windows/Linux: minimize to tray on close (if tray exists)
  if (process.platform !== 'darwin') {
    mainWindow.on('close', (event) => {
      if (!(app as any).isQuitting) {
        event.preventDefault();
        mainWindow?.hide();
      }
    });
  }
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

    // 1. Initialize the local SQLite database
    const dbPath = path.join(app.getPath('userData'), 'syncbooks.db');
    await initializeDatabase(dbPath);
    log.info('Database initialized');

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
  } catch (error) {
    log.error('Failed to start app:', error);
    app.quit();
  }
}

// App lifecycle
app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  // On macOS, keep app running in background
  if (process.platform !== 'darwin') {
    app.quit();
  }
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
