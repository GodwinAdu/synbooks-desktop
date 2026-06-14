/**
 * Preload script (plain JS - Electron requires this)
 * Bridges the main process and renderer securely.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getDbPath: () => ipcRenderer.invoke('get-db-path'),

  // Sync operations
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  triggerSync: () => ipcRenderer.invoke('sync:trigger'),
  connectToCloud: (params) => ipcRenderer.invoke('sync:connect', params),
  disconnectCloud: () => ipcRenderer.invoke('sync:disconnect'),
  initialSync: () => ipcRenderer.invoke('sync:initial'),
  isSyncConfigured: () => ipcRenderer.invoke('sync:is-configured'),

  // Network status notification
  setNetworkStatus: (isOnline) => ipcRenderer.send('network:status', isOnline),

  // Platform
  platform: process.platform,
});
