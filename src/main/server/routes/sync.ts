/**
 * Sync API Routes (Local)
 * 
 * Exposes sync status and control to the renderer via the local Express API.
 * The heavy lifting is done by the SyncEngine in the main process via IPC,
 * but the renderer can also get status via HTTP for simplicity.
 */

import { Router, Response } from 'express';
import { getDB, dbAll, dbGet } from '../../database';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const syncRouter = Router();

/**
 * GET /api/sync/status
 */
syncRouter.get('/status', (req: AuthenticatedRequest, res: Response) => {
  const pendingCount = dbGet(`SELECT COUNT(*) as count FROM _sync_log WHERE status = 'pending'`);
  const conflictCount = dbGet(`SELECT COUNT(*) as count FROM _sync_log WHERE status = 'conflict'`);
  const lastSync = dbGet(`SELECT MAX(lastSyncedAt) as lastSynced FROM _sync_state`);

  res.json({
    pendingChanges: pendingCount.count,
    conflicts: conflictCount.count,
    lastSyncedAt: lastSync?.lastSynced || null,
    mode: 'offline',
  });
});

/**
 * GET /api/sync/log
 * View sync log entries
 */
syncRouter.get('/log', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const { limit = '50', status } = req.query;
  let query = `SELECT * FROM _sync_log`;
  const params: any[] = [];
  if (status) { query += ' WHERE status = ?'; params.push(status); }
  query += ' ORDER BY createdAt DESC LIMIT ?';
  params.push(parseInt(limit as string));
  res.json(dbAll(query, params));
});

/**
 * GET /api/sync/conflicts
 * View unresolved conflicts
 */
syncRouter.get('/conflicts', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const conflicts = dbAll(`SELECT * FROM _sync_log WHERE status = 'conflict' ORDER BY createdAt DESC`);

  // Parse the data field to show local vs remote values
  const enriched = conflicts.map((c: any) => {
    let parsedData = null;
    try { parsedData = JSON.parse(c.data); } catch {}
    return { ...c, parsedData };
  });

  res.json(enriched);
});

/**
 * POST /api/sync/resolve-conflict
 * Resolve a conflict by choosing local or remote version
 */
syncRouter.post('/resolve-conflict', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const { conflictId, resolution } = req.body; // resolution: 'local' | 'remote'

  if (!conflictId || !resolution) {
    res.status(400).json({ error: 'conflictId and resolution are required' });
    return;
  }

  const conflict = dbGet(`SELECT * FROM _sync_log WHERE id = ? AND status = 'conflict'`, [conflictId]);
  if (!conflict) {
    res.status(404).json({ error: 'Conflict not found' });
    return;
  }

  if (resolution === 'remote') {
    // Apply remote version to local database
    try {
      const parsedData = JSON.parse(conflict.data);
      if (parsedData?.remote) {
        const { Repository } = require('../../database/repository');
        const repo = new Repository(conflict.tableName);
        repo.bulkUpsert([{ ...parsedData.remote, id: conflict.recordId }]);
      }
    } catch (err: any) {
      res.status(500).json({ error: `Failed to apply remote: ${err.message}` });
      return;
    }
  }
  // If 'local', we keep local version and just mark it to be pushed again

  // Mark conflict as resolved
  db.run(`UPDATE _sync_log SET status = 'synced' WHERE id = ?`, [conflictId]);

  // If keeping local, re-queue for push
  if (resolution === 'local') {
    const { v4: uuid } = require('uuid');
    db.run(
      `INSERT INTO _sync_log (id, tableName, operation, recordId, data, status, createdAt) VALUES (?, ?, 'update', ?, ?, 'pending', datetime('now'))`,
      [uuid(), conflict.tableName, conflict.recordId, '{}']
    );
  }

  res.json({ success: true, message: `Conflict resolved: kept ${resolution} version` });
});

/**
 * POST /api/sync/clear-synced
 * Clean up synced entries from the log
 */
syncRouter.post('/clear-synced', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  db.run(`DELETE FROM _sync_log WHERE status = 'synced'`);
  res.json({ success: true });
});

/**
 * GET /api/sync/tables
 * Get sync state per table
 */
syncRouter.get('/tables', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const states = dbAll(`SELECT * FROM _sync_state ORDER BY tableName`);
  res.json(states);
});

/**
 * POST /api/sync/bulk-import
 * Imports data pulled from cloud into the local SQLite database.
 * Called by the renderer's cloud-client after pulling from cloud.
 * Does NOT require auth (called during login flow before token exists).
 */
syncRouter.post('/bulk-import', (req: any, res: Response) => {
  try {
    const { tables } = req.body;
    if (!tables || typeof tables !== 'object') {
      res.status(400).json({ error: 'tables object is required' });
      return;
    }

    const { Repository } = require('../../database/repository');
    let totalInserted = 0;

    for (const [tableName, records] of Object.entries(tables)) {
      if (!Array.isArray(records) || records.length === 0) continue;

      try {
        const repo = new Repository(tableName);
        const count = repo.bulkUpsert(records as any[]);
        totalInserted += count;
      } catch (err: any) {
        // Skip tables that don't exist in local schema
        console.warn(`[bulk-import] Skipped ${tableName}: ${err.message}`);
      }
    }

    res.json({ success: true, totalInserted });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Bulk import failed' });
  }
});
