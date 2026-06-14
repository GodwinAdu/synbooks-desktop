/**
 * Cloud Client
 * Handles direct communication with the cloud backend for sync.
 * Replaces the Electron IPC approach so it works in both
 * Electron and plain browser (Vite dev server) contexts.
 */

const STORAGE_KEY = "cloud-sync-config";

interface CloudConfig {
  cloudApiUrl: string;
  syncToken: string;
  organizationId: string;
  email: string;
}

function getConfig(): CloudConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveConfig(config: CloudConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Authenticate with cloud backend and get a sync token.
 */
export async function connectToCloud(params: {
  cloudApiUrl: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${params.cloudApiUrl}/api/desktop-sync/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: params.email, password: params.password }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return { success: false, error: err.error || "Authentication failed" };
    }

    const data = await response.json();

    saveConfig({
      cloudApiUrl: params.cloudApiUrl,
      syncToken: data.syncToken,
      organizationId: data.user.organizationId,
      email: data.user.email,
    });

    // Sync the subscription plan from cloud to desktop licensing
    if (data.subscription && data.subscription.planId) {
      const token = localStorage.getItem("token");
      try {
        await fetch("http://127.0.0.1:45678/api/licensing/sync-cloud-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            planId: data.subscription.planId,
            expiresAt: data.subscription.expiresAt,
            modules: data.subscription.modules || [],
            status: data.subscription.status,
          }),
        });
      } catch {
        // Non-critical — plan sync can happen later
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Connection failed" };
  }
}

/**
 * Pull all data from cloud (initial sync).
 * Fetches from cloud, then sends to local server for DB insertion.
 */
export async function initialSync(): Promise<{ success: boolean; totalRecords: number; error?: string }> {
  const config = getConfig();
  if (!config) return { success: false, totalRecords: 0, error: "Not connected to cloud" };

  try {
    const response = await fetch(`${config.cloudApiUrl}/api/desktop-sync/pull-all?limit=5000`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.syncToken}`,
        "X-Organization-Id": config.organizationId,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, totalRecords: 0, error: err.error || `HTTP ${response.status}` };
    }

    const { tables, totalRecords } = await response.json();

    // Send pulled data to the local server for DB insertion
    const token = localStorage.getItem("auth-token");
    const localHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (token) localHeaders["Authorization"] = `Bearer ${token}`;

    const insertResponse = await fetch("http://127.0.0.1:45678/api/sync/bulk-import", {
      method: "POST",
      headers: localHeaders,
      body: JSON.stringify({ tables }),
    });

    if (!insertResponse.ok) {
      const err = await insertResponse.json().catch(() => ({}));
      return { success: false, totalRecords: 0, error: err.error || "Failed to import data locally" };
    }

    const insertResult = await insertResponse.json();
    return { success: true, totalRecords: insertResult.totalInserted || totalRecords || 0 };
  } catch (err: any) {
    return { success: false, totalRecords: 0, error: err.message };
  }
}

/**
 * Disconnect from cloud.
 */
export function disconnectCloud(): void {
  clearConfig();
}

/**
 * Check if cloud is configured.
 */
export function isCloudConfigured(): boolean {
  return !!getConfig();
}

/**
 * Get cloud sync status.
 */
export function getCloudConfig(): CloudConfig | null {
  return getConfig();
}
