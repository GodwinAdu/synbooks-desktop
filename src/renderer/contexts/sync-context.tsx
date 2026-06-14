import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api-client';

interface SyncStatus {
  pendingChanges: number;
  conflicts: number;
  lastSyncedAt: string | null;
  mode: string;
  isOnline: boolean;
  connected: boolean;
  syncing: boolean;
  lastError: string | null;
  config?: { email: string; cloudApiUrl: string } | null;
}

interface SyncContextType {
  status: SyncStatus;
  triggerSync: () => Promise<void>;
  isOnline: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [status, setStatus] = useState<SyncStatus>({
    pendingChanges: 0,
    conflicts: 0,
    lastSyncedAt: null,
    mode: 'disconnected',
    isOnline: navigator.onLine,
    connected: false,
    syncing: false,
    lastError: null,
    config: null,
  });

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      window.electronAPI?.setNetworkStatus(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      window.electronAPI?.setNetworkStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll sync status every 15 seconds (only when logged in)
  useEffect(() => {
    const fetchStatus = async () => {
      // Skip polling if no auth token
      const token = localStorage.getItem("auth-token");
      if (!token) return;

      try {
        if (window.electronAPI) {
          const engineStatus = await window.electronAPI.getSyncStatus();
          setStatus(prev => ({ ...prev, ...engineStatus, isOnline }));
        } else {
          // Fallback: get from local API (may 401 if not logged in)
          const data = await api.get("/sync/status").catch(() => null);
          if (data) setStatus(prev => ({ ...prev, ...data, isOnline }));
        }
      } catch {}
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const triggerSync = useCallback(async () => {
    try {
      setStatus(s => ({ ...s, syncing: true, mode: 'syncing' }));
      if (window.electronAPI) {
        await window.electronAPI.triggerSync();
        const engineStatus = await window.electronAPI.getSyncStatus();
        setStatus(prev => ({ ...prev, ...engineStatus, isOnline }));
      }
    } catch (error) {
      console.error('Sync trigger failed:', error);
      setStatus(s => ({ ...s, syncing: false }));
    }
  }, [isOnline]);

  return (
    <SyncContext.Provider value={{ status, triggerSync, isOnline }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
