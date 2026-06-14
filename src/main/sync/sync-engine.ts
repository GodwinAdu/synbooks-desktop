/**
 * Sync Engine
 * 
 * Handles bidirectional sync between the local SQLite database
 * and the cloud MongoDB backend when the user is online.
 * 
 * Strategy: 
 * - All local mutations are logged to _sync_log table
 * - When online, push pending changes via /api/desktop-sync/push-batch
 * - Pull new/updated records via /api/desktop-sync/pull
 * - Detect and flag conflicts for user resolution
 * 
 * The cloud backend exposes:
 * - POST /api/desktop-sync/auth       → authenticate and get sync token
 * - POST /api/desktop-sync/push       → push single change
 * - POST /api/desktop-sync/push-batch → push multiple changes
 * - GET  /api/desktop-sync/pull       → pull changes since timestamp
 * - GET  /api/desktop-sync/pull-all   → initial full sync
 * - GET  /api/desktop-sync/status     → connection health
 */

import log from 'electron-log';
import { getDB, dbAll, dbGet } from '../database';
import { Repository } from '../database/repository';
import Store from 'electron-store';

const store = new Store({ name: 'sync-config' } as any);

interface SyncConfig {
  cloudApiUrl: string;
  syncToken: string;
  organizationId: string;
  userId: string;
  email: string;
}

interface SyncStatus {
  connected: boolean;
  lastSyncedAt: string | null;
  pendingChanges: number;
  syncing: boolean;
  lastError: string | null;
  mode: 'disconnected' | 'online' | 'syncing' | 'error';
}

// Tables that participate in sync (must match backend MODEL_MAP keys)
const SYNC_TABLES = [
  'organizations', 'users', 'accounts', 'customers', 'vendors',
  'invoices', 'expenses', 'bills', 'payments', 'products',
  'employees', 'payroll_runs', 'bank_accounts', 'bank_transactions',
  'journal_entries', 'general_ledger', 'projects', 'budgets',
  'fixed_assets', 'crm_contacts', 'crm_deals', 'pos_sales',
  'estimates', 'credit_notes', 'purchase_orders',
];

export class SyncEngine {
  private config: SyncConfig | null = null;
  private status: SyncStatus = {
    connected: false,
    lastSyncedAt: null,
    pendingChanges: 0,
    syncing: false,
    lastError: null,
    mode: 'disconnected',
  };
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline = false;

  async initialize(): Promise<void> {
    // Load stored config from electron-store
    const savedConfig = (store as any).get('syncConfig') as SyncConfig | undefined;
    if (savedConfig) {
      this.config = savedConfig;
      log.info('Loaded sync config for:', savedConfig.email);
    }

    // Load last sync state
    try {
      const db = getDB();
      const lastSync = dbGet(`SELECT MAX(lastSyncedAt) as lastSynced FROM _sync_state`);
      this.status.lastSyncedAt = lastSync?.lastSynced || null;

      const pending = dbGet(`SELECT COUNT(*) as count FROM _sync_log WHERE status = 'pending'`);
      this.status.pendingChanges = pending?.count || 0;
    } catch (error) {
      log.warn('Sync engine: no previous sync state');
    }

    log.info('Sync engine initialized', { pending: this.status.pendingChanges, hasConfig: !!this.config });
  }

  /**
   * Authenticate with the cloud backend.
   * Called from the renderer when user wants to connect to cloud.
   */
  async authenticate(cloudApiUrl: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${cloudApiUrl}/api/desktop-sync/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const err: any = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        return { success: false, error: err.error || 'Authentication failed' };
      }

      const data: any = await response.json();

      this.config = {
        cloudApiUrl,
        syncToken: data.syncToken,
        organizationId: data.user.organizationId,
        userId: data.user.id,
        email: data.user.email,
      };

      // Persist config
      (store as any).set('syncConfig', this.config);

      this.isOnline = true;
      this.status.connected = true;
      this.status.mode = 'online';
      this.startAutoSync();

      log.info('Cloud sync authenticated successfully for:', email);

      // Trigger initial sync
      this.syncAll().catch(err => log.error('Initial sync failed:', err));

      return { success: true };
    } catch (error: any) {
      log.error('Cloud auth failed:', error);
      return { success: false, error: error.message || 'Connection failed' };
    }
  }

  /**
   * Disconnect from cloud sync
   */
  disconnect(): void {
    this.config = null;
    (store as any).delete('syncConfig');
    this.status.connected = false;
    this.status.mode = 'disconnected';
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    log.info('Cloud sync disconnected');
  }

  /**
   * Perform initial full sync (downloads everything from cloud)
   */
  async initialSync(): Promise<{ success: boolean; totalRecords: number; error?: string }> {
    if (!this.config) return { success: false, totalRecords: 0, error: 'Not configured' };

    try {
      log.info('Starting initial full sync...');
      this.status.syncing = true;
      this.status.mode = 'syncing';

      const response = await fetch(
        `${this.config.cloudApiUrl}/api/desktop-sync/pull-all?limit=5000`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        const err: any = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const pullData: any = await response.json();
      const tables = pullData.tables;
      const totalRecords = pullData.totalRecords;

      // Insert all records into local database
      let inserted = 0;
      for (const [tableName, records] of Object.entries(tables)) {
        if (!Array.isArray(records) || records.length === 0) continue;

        const repo = new Repository<any>(tableName);
        const count = repo.bulkUpsert(records as any[]);
        inserted += count;
        log.info(`  Synced ${count} records to ${tableName}`);
      }

      // Update sync state
      const now = new Date().toISOString();
      const db = getDB();
      for (const table of SYNC_TABLES) {
        try {
          db.run(`INSERT OR REPLACE INTO _sync_state (tableName, lastSyncedAt, recordCount) VALUES (?, ?, (SELECT COUNT(*) FROM ${table}))`, [table, now]);
        } catch {}
      }

      this.status.lastSyncedAt = now;
      this.status.syncing = false;
      this.status.mode = 'online';

      log.info(`Initial sync complete: ${inserted} records across ${Object.keys(tables as any).length} tables`);
      return { success: true, totalRecords: inserted };
    } catch (error: any) {
      this.status.syncing = false;
      this.status.mode = 'error';
      this.status.lastError = error.message;
      log.error('Initial sync failed:', error);
      return { success: false, totalRecords: 0, error: error.message };
    }
  }

  /**
   * Start periodic auto-sync (every 5 minutes when online)
   */
  private startAutoSync(): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.status.syncing) {
        this.syncAll().catch(err => log.error('Auto-sync failed:', err));
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Full sync cycle: push local changes, then pull remote changes
   */
  async syncAll(): Promise<{ pushed: number; pulled: number; conflicts: number }> {
    if (!this.config) {
      log.warn('Sync not configured - skipping');
      return { pushed: 0, pulled: 0, conflicts: 0 };
    }

    if (this.status.syncing) {
      log.info('Sync already in progress - skipping');
      return { pushed: 0, pulled: 0, conflicts: 0 };
    }

    this.status.syncing = true;
    this.status.mode = 'syncing';
    let pushed = 0, pulled = 0, conflicts = 0;

    try {
      log.info('Starting sync cycle...');

      // Check cloud connectivity first
      const healthCheck = await this.checkConnection();
      if (!healthCheck) {
        throw new Error('Cloud server unreachable');
      }

      // Phase 1: Push local changes to cloud
      pushed = await this.pushChanges();

      // Phase 2: Pull remote changes from cloud
      const pullResult = await this.pullChanges();
      pulled = pullResult.pulled;
      conflicts = pullResult.conflicts;

      // Update sync state
      const now = new Date().toISOString();
      this.status.lastSyncedAt = now;
      this.status.lastError = null;
      this.status.connected = true;
      this.status.mode = 'online';

      const db = getDB();
      for (const table of SYNC_TABLES) {
        try {
          db.run(`INSERT OR REPLACE INTO _sync_state (tableName, lastSyncedAt, recordCount) VALUES (?, ?, (SELECT COUNT(*) FROM ${table}))`, [table, now]);
        } catch {}
      }

      log.info(`Sync complete: pushed=${pushed}, pulled=${pulled}, conflicts=${conflicts}`);
    } catch (error: any) {
      this.status.lastError = error.message;
      this.status.connected = false;
      this.status.mode = 'error';
      log.error('Sync failed:', error.message);
    } finally {
      this.status.syncing = false;
      this.updatePendingCount();
    }

    return { pushed, pulled, conflicts };
  }

  /**
   * Push pending local changes to cloud using batch endpoint
   */
  private async pushChanges(): Promise<number> {
    const db = getDB();
    const pendingLogs = dbAll(`SELECT * FROM _sync_log WHERE status = 'pending' ORDER BY createdAt ASC LIMIT 200`);

    if (pendingLogs.length === 0) return 0;

    // Group into batches of 50
    const batchSize = 50;
    let totalPushed = 0;

    for (let i = 0; i < pendingLogs.length; i += batchSize) {
      const batch = pendingLogs.slice(i, i + batchSize);

      const changes = batch.map(entry => ({
        table: entry.tableName,
        operation: entry.operation,
        recordId: entry.recordId,
        data: JSON.parse(entry.data || '{}'),
        timestamp: entry.createdAt,
      }));

      try {
        const response = await fetch(`${this.config!.cloudApiUrl}/api/desktop-sync/push-batch`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ changes }),
        });

        if (!response.ok) {
          const err: any = await response.json().catch(() => ({}));
          log.warn(`Push batch failed: ${err.error || response.status}`);
          for (const entry of batch) {
            db.run(`UPDATE _sync_log SET retryCount = retryCount + 1, errorMessage = ? WHERE id = ?`,
              [err.error || `HTTP ${response.status}`, entry.id]);
          }
          continue;
        }

        const responseData: any = await response.json();
        const results = responseData.results;

        // Update sync log based on results
        for (let j = 0; j < batch.length; j++) {
          const entry = batch[j];
          const result = results?.[j];

          if (result?.status === 'success') {
            db.run(`UPDATE _sync_log SET status = 'synced', syncedAt = datetime('now') WHERE id = ?`, [entry.id]);
            totalPushed++;
          } else if (result?.status === 'conflict') {
            db.run(`UPDATE _sync_log SET status = 'conflict', errorMessage = ? WHERE id = ?`,
              [result.message || 'Conflict', entry.id]);
          } else {
            db.run(`UPDATE _sync_log SET retryCount = retryCount + 1, errorMessage = ? WHERE id = ?`,
              [result?.message || 'Unknown error', entry.id]);
          }
        }
      } catch (error: any) {
        log.warn(`Push batch network error: ${error.message}`);
        // Don't mark as failed on network errors — will retry next cycle
        break;
      }
    }

    return totalPushed;
  }

  /**
   * Pull remote changes from cloud since last sync
   */
  private async pullChanges(): Promise<{ pulled: number; conflicts: number }> {
    let totalPulled = 0;
    let totalConflicts = 0;

    for (const table of SYNC_TABLES) {
      try {
        const db = getDB();
        const syncState = dbGet(`SELECT lastSyncedAt FROM _sync_state WHERE tableName = ?`, [table]);
        const since = syncState?.lastSyncedAt || '1970-01-01T00:00:00.000Z';

        const url = `${this.config!.cloudApiUrl}/api/desktop-sync/pull?table=${table}&since=${encodeURIComponent(since)}&limit=500`;
        const response = await fetch(url, { headers: this.getHeaders() });

        if (!response.ok) continue;

        const pullResult: any = await response.json();
        const records = pullResult.records;
        if (!records || records.length === 0) continue;

        const repo = new Repository<any>(table);

        for (const record of records) {
          const recordId = record.id || record._id;
          if (!recordId) continue;

          const localRecord = repo.findById(recordId);

          if (!localRecord) {
            // New record from cloud — insert locally
            repo.bulkUpsert([{ ...record, id: recordId }]);
            totalPulled++;
          } else if (localRecord._dirty) {
            // Local has unsynced changes — CONFLICT
            totalConflicts++;
            try {
              const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              db.run(
                `INSERT INTO _sync_log (id, tableName, operation, recordId, data, status, createdAt) VALUES (?, ?, 'conflict', ?, ?, 'conflict', datetime('now'))`,
                [conflictId, table, recordId, JSON.stringify({ local: localRecord, remote: record })]
              );
            } catch {
              // Non-fatal — just count the conflict
            }
          } else {
            // No local changes — safe to overwrite with cloud version
            repo.bulkUpsert([{ ...record, id: recordId }]);
            totalPulled++;
          }
        }
      } catch (error: any) {
        log.warn(`Pull failed for ${table}: ${error.message}`);
      }
    }

    return { pulled: totalPulled, conflicts: totalConflicts };
  }

  /**
   * Check if cloud server is reachable
   */
  private async checkConnection(): Promise<boolean> {
    if (!this.config) return false;
    try {
      const response = await fetch(`${this.config.cloudApiUrl}/api/desktop-sync/status`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Build auth headers for cloud requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config!.syncToken}`,
      'X-Organization-Id': this.config!.organizationId,
    };
  }

  private updatePendingCount(): void {
    try {
      const result = dbGet(`SELECT COUNT(*) as count FROM _sync_log WHERE status = 'pending'`);
      this.status.pendingChanges = result?.count || 0;
    } catch {}
  }

  getStatus(): SyncStatus & { config?: { email: string; cloudApiUrl: string } | null } {
    this.updatePendingCount();
    return {
      ...this.status,
      config: this.config ? { email: this.config.email, cloudApiUrl: this.config.cloudApiUrl } : null,
    };
  }

  isConfigured(): boolean {
    return !!this.config;
  }

  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    if (online && this.config) {
      this.status.mode = 'online';
      this.syncAll().catch(err => log.error('Online sync trigger failed:', err));
    } else if (!online) {
      this.status.mode = 'disconnected';
      this.status.connected = false;
    }
  }

  async shutdown(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    log.info('Sync engine shut down');
  }
}
