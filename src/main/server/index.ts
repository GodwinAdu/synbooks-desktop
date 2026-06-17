/**
 * Embedded Express API Server
 * 
 * Runs locally inside Electron to serve the renderer process.
 * Mirrors the cloud backend's API structure so the frontend
 * React components can use the same API client code.
 * 
 * Key difference: uses SQLite instead of MongoDB.
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { authRouter } from './routes/auth';
import { invoicesRouter } from './routes/invoices';
import { expensesRouter } from './routes/expenses';
import { billsRouter } from './routes/bills';
import { customersRouter } from './routes/customers';
import { vendorsRouter } from './routes/vendors';
import { accountsRouter } from './routes/accounts';
import { productsRouter } from './routes/products';
import { employeesRouter } from './routes/employees';
import { payrollRouter } from './routes/payroll';
import { bankingRouter } from './routes/banking';
import { journalEntriesRouter } from './routes/journal-entries';
import { generalLedgerRouter } from './routes/general-ledger';
import { periodCloseRouter } from './routes/period-close';
import { yearEndCloseRouter } from './routes/year-end-close';
import { reportsRouter } from './routes/reports';
import { projectsRouter } from './routes/projects';
import { budgetsRouter } from './routes/budgets';
import { assetsRouter } from './routes/assets';
import { crmRouter } from './routes/crm';
import { posRouter } from './routes/pos';
import { dashboardRouter } from './routes/dashboard';
import { settingsRouter } from './routes/settings';
import { syncRouter } from './routes/sync';
import { productionRouter } from './routes/production';
import { procurementRouter } from './routes/procurement';
import { contractsRouter } from './routes/contracts';
import { licensingRouter } from './routes/licensing';
import { rolesRouter } from './routes/roles';
import { usersRouter } from './routes/users';
import { localAuth } from './middleware/local-auth';
import log from 'electron-log';

let server: http.Server | null = null;

export async function startLocalServer(port: number): Promise<void> {
  const app = express();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', mode: 'offline-desktop', timestamp: new Date().toISOString() });
  });

  // Auth routes (login/register - no auth middleware)
  app.use('/api/auth', authRouter);

  // Module access enforcement on ALL protected routes
  const { checkModuleAccess } = require('./middleware/plan-limits');

  // Protected routes - with module enforcement
  app.use('/api/dashboard', localAuth, dashboardRouter);
  app.use('/api/invoices', localAuth, checkModuleAccess('sales'), invoicesRouter);
  app.use('/api/expenses', localAuth, checkModuleAccess('expenses'), expensesRouter);
  app.use('/api/bills', localAuth, checkModuleAccess('expenses'), billsRouter);
  app.use('/api/customers', localAuth, checkModuleAccess('sales'), customersRouter);
  app.use('/api/vendors', localAuth, checkModuleAccess('expenses'), vendorsRouter);
  app.use('/api/accounts', localAuth, accountsRouter); // always available (accounting module)
  app.use('/api/products', localAuth, checkModuleAccess('products'), productsRouter);
  app.use('/api/employees', localAuth, checkModuleAccess('payroll'), employeesRouter);
  app.use('/api/payroll', localAuth, checkModuleAccess('payroll'), payrollRouter);
  app.use('/api/banking', localAuth, bankingRouter); // always available (banking module)
  app.use('/api/journal-entries', localAuth, journalEntriesRouter); // accounting - always available
  app.use('/api/general-ledger', localAuth, generalLedgerRouter); // accounting - always available
  app.use('/api/period-close', localAuth, periodCloseRouter); // accounting - always available
  app.use('/api/year-end-close', localAuth, yearEndCloseRouter); // accounting - always available
  app.use('/api/reports', localAuth, reportsRouter); // always available (reports module)
  app.use('/api/projects', localAuth, checkModuleAccess('projects'), projectsRouter);
  app.use('/api/budgets', localAuth, checkModuleAccess('budgets'), budgetsRouter);
  app.use('/api/assets', localAuth, checkModuleAccess('assets'), assetsRouter);
  app.use('/api/crm', localAuth, checkModuleAccess('crm'), crmRouter);
  app.use('/api/pos', localAuth, checkModuleAccess('pos'), posRouter);
  app.use('/api/settings', localAuth, settingsRouter);
  app.use('/api/production', localAuth, checkModuleAccess('production'), productionRouter);
  app.use('/api/procurement', localAuth, checkModuleAccess('procurement'), procurementRouter);
  app.use('/api/contracts', localAuth, checkModuleAccess('contracts'), contractsRouter);
  app.use('/api/licensing', localAuth, licensingRouter);
  app.use('/api/roles', localAuth, rolesRouter);
  app.use('/api/users', usersRouter); // Auth handled inside routes
  
  // Sync routes - bulk-import doesn't require auth (called during login flow)
  app.post('/api/sync/bulk-import', (req: any, res: any, next: any) => {
    const { Repository } = require('../database/repository');
    try {
      const { tables } = req.body;
      if (!tables || typeof tables !== 'object') { res.status(400).json({ error: 'tables required' }); return; }
      let totalInserted = 0;
      for (const [tableName, records] of Object.entries(tables)) {
        if (!Array.isArray(records) || records.length === 0) continue;
        try { const repo = new Repository(tableName); totalInserted += repo.bulkUpsert(records as any[]); } catch {}
      }
      res.json({ success: true, totalInserted });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.use('/api/sync', localAuth, syncRouter);

  // Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    log.error('API Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

  // In production, serve the renderer static files via Express
  // This avoids file:// protocol issues with ES modules in Electron
  if (process.env.NODE_ENV !== 'development') {
    const { app: electronApp } = require('electron');
    const rendererDir = require('path').join(electronApp.getAppPath(), 'dist', 'renderer');
    log.info('[Server] Serving renderer from:', rendererDir);
    app.use(express.static(rendererDir));
    // SPA fallback: serve index.html for all non-API routes
    app.get('*', (_req, res) => {
      res.sendFile(require('path').join(rendererDir, 'index.html'));
    });
  }

  return new Promise((resolve, reject) => {
    server = http.createServer(app);
    server.listen(port, '127.0.0.1', () => {
      log.info(`Local API server listening on http://127.0.0.1:${port}`);
      resolve();
    });
    server.on('error', reject);
  });
}

export function stopLocalServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}
