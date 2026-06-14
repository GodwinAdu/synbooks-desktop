/**
 * Preload script - bridges the main process and renderer securely.
 * Exposes a controlled API to the renderer via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getDbPath: () => ipcRenderer.invoke('get-db-path'),

  // Sync operations
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  triggerSync: () => ipcRenderer.invoke('sync:trigger'),
  connectToCloud: (params: { cloudApiUrl: string; email: string; password: string }) =>
    ipcRenderer.invoke('sync:connect', params),
  disconnectCloud: () => ipcRenderer.invoke('sync:disconnect'),
  initialSync: () => ipcRenderer.invoke('sync:initial'),
  isSyncConfigured: () => ipcRenderer.invoke('sync:is-configured'),

  // Network status notification
  setNetworkStatus: (isOnline: boolean) => ipcRenderer.send('network:status', isOnline),

  // Platform
  platform: process.platform,
});

// Type declaration for the renderer
export interface ElectronAPI {
  getAppInfo: () => Promise<{ version: string; dataPath: string; platform: string }>;
  getDbPath: () => Promise<string>;
  getSyncStatus: () => Promise<{
    connected: boolean;
    lastSyncedAt: string | null;
    pendingChanges: number;
    syncing: boolean;
    lastError: string | null;
    mode: string;
    config?: { email: string; cloudApiUrl: string } | null;
  }>;
  triggerSync: () => Promise<{ pushed: number; pulled: number; conflicts: number }>;
  connectToCloud: (params: { cloudApiUrl: string; email: string; password: string }) =>
    Promise<{ success: boolean; error?: string }>;
  disconnectCloud: () => Promise<{ success: boolean }>;
  initialSync: () => Promise<{ success: boolean; totalRecords: number; error?: string }>;
  isSyncConfigured: () => Promise<boolean>;
  setNetworkStatus: (isOnline: boolean) => void;
  platform: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
