/**
 * License Context
 * Provides plan info, module access checks, and license management to the app.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api-client";

interface LicenseStatus {
  planId: string;
  planName: string;
  description: string;
  status: "active" | "trial" | "expired" | "free";
  daysLeft?: number;
  expiresAt?: string;
  modules: string[];
  cloudSync: boolean;
  maxUsers: number;
  price: { monthly: number; annual: number };
  color: string;
  hasLicenseKey: boolean;
  trialStartedAt?: string;
}

interface LicenseContextValue {
  license: LicenseStatus | null;
  loading: boolean;
  canAccess: (moduleId: string) => boolean;
  refresh: () => void;
  activateKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  deactivateKey: () => Promise<void>;
}

const defaultLicense: LicenseStatus = {
  planId: "free",
  planName: "Free",
  description: "",
  status: "free",
  modules: ["accounting", "banking", "reports"],
  cloudSync: false,
  maxUsers: 1,
  price: { monthly: 0, annual: 0 },
  color: "gray",
  hasLicenseKey: false,
};

const LicenseContext = createContext<LicenseContextValue>({
  license: null,
  loading: true,
  canAccess: () => true,
  refresh: () => {},
  activateKey: async () => ({ success: false }),
  deactivateKey: async () => {},
});

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(() => {
    const token = localStorage.getItem("auth-token");
    if (!token) {
      setLicense(defaultLicense);
      setLoading(false);
      return;
    }
    api.get("/licensing/status")
      .then((data: any) => setLicense(data))
      .catch(() => setLicense(defaultLicense))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Small delay to ensure startTrial() has finished on first launch
    const timer = setTimeout(fetchStatus, 300);
    return () => clearTimeout(timer);
  }, [fetchStatus]);

  // Re-fetch when auth token changes (login/register)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "auth-token") fetchStatus();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fetchStatus]);

  const canAccess = useCallback((moduleId: string): boolean => {
    if (!license) return true; // loading - allow access
    return license.modules.includes(moduleId);
  }, [license]);

  const activateKey = useCallback(async (key: string) => {
    try {
      const result: any = await api.post("/licensing/activate", { key });
      if (result.success) {
        fetchStatus();
        return { success: true };
      }
      return { success: false, error: result.error || "Activation failed" };
    } catch (err: any) {
      return { success: false, error: err.message || "Activation failed" };
    }
  }, [fetchStatus]);

  const deactivateKey = useCallback(async () => {
    await api.post("/licensing/deactivate", {});
    fetchStatus();
  }, [fetchStatus]);

  return (
    <LicenseContext.Provider value={{ license, loading, canAccess, refresh: fetchStatus, activateKey, deactivateKey }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  return useContext(LicenseContext);
}
