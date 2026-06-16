/**
 * Permission Context
 * 
 * Provides permission checking throughout the React app.
 * Fetches the current user's permissions from their role and
 * exposes utility functions for conditional rendering.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api-client';
import { useAuth } from './auth-context';

interface PermissionContextType {
  permissions: Record<string, boolean>;
  isLoading: boolean;
  hasPermission: (key: string) => boolean;
  hasAnyPermission: (keys: string[]) => boolean;
  hasAllPermissions: (keys: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions({});
      setIsLoading(false);
      return;
    }

    // Admin and owner always have all permissions
    if (user.role === 'admin' || user.role === 'owner') {
      // Set all to true for admin/owner
      setPermissions(new Proxy({}, { get: () => true }) as Record<string, boolean>);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.get<{ permissions: Record<string, boolean> }>('/auth/permissions');
      setPermissions(data.permissions || {});
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      setPermissions({});
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((key: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'owner') return true;
    return permissions[key] === true;
  }, [user, permissions]);

  const hasAnyPermission = useCallback((keys: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'owner') return true;
    return keys.some(key => permissions[key] === true);
  }, [user, permissions]);

  const hasAllPermissions = useCallback((keys: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'owner') return true;
    return keys.every(key => permissions[key] === true);
  }, [user, permissions]);

  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    await fetchPermissions();
  }, [fetchPermissions]);

  return (
    <PermissionContext.Provider value={{
      permissions,
      isLoading,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      refreshPermissions,
    }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionProvider');
  return ctx;
}
