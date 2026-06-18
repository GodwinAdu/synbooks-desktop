import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const settingsRouter = Router();
const orgRepo = new Repository<any>('organizations');
const userRepo = new Repository<any>('users');

settingsRouter.get('/organization', (req: AuthenticatedRequest, res: Response) => {
  const org = orgRepo.findById(req.organizationId!);
  if (!org) { res.status(404).json({ error: 'Organization not found' }); return; }
  res.json(org);
});

settingsRouter.put('/organization', (req: AuthenticatedRequest, res: Response) => {
  // Merge nested settings objects instead of overwriting
  const org = orgRepo.findById(req.organizationId!);
  if (!org) { res.status(404).json({ error: 'Organization not found' }); return; }

  const updateData: any = { ...req.body };

  // Merge settings object
  if (req.body.settings) {
    const existingSettings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});
    updateData.settings = { ...existingSettings, ...req.body.settings };
  }

  // Merge taxSettings object
  if (req.body.taxSettings) {
    const existingTax = typeof org.taxSettings === 'string' ? JSON.parse(org.taxSettings || '{}') : (org.taxSettings || {});
    updateData.taxSettings = { ...existingTax, ...req.body.taxSettings };
  }

  // Merge address object
  if (req.body.address) {
    const existingAddr = typeof org.address === 'string' ? JSON.parse(org.address || '{}') : (org.address || {});
    updateData.address = { ...existingAddr, ...req.body.address };
  }

  const updated = orgRepo.update(req.organizationId!, updateData);
  res.json({ success: true, data: updated });
});

settingsRouter.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const users = userRepo.find({ where: { organizationId: req.organizationId, del_flag: 0 } });
  res.json(users.map((u: any) => ({ ...u, password: undefined })));
});

settingsRouter.put('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = userRepo.findById(req.params.id);
  if (!user || user.organizationId !== req.organizationId) { res.status(404).json({ error: 'User not found' }); return; }
  const { password, ...data } = req.body;
  res.json({ success: true, data: userRepo.update(req.params.id, data) });
});

settingsRouter.get('/modules', (req: AuthenticatedRequest, res: Response) => {
  const org = orgRepo.findById(req.organizationId!);
  res.json(org?.modules || {});
});

settingsRouter.put('/modules', (req: AuthenticatedRequest, res: Response) => {
  orgRepo.update(req.organizationId!, { modules: req.body });
  res.json({ success: true });
});

// ─── Database Management Endpoints ──────────────────────────────────────────

import { getDB, saveToDisk } from '../../database';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

settingsRouter.get('/database-stats', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDB();
    const dbPath = path.join(app.getPath('userData'), 'syncbooks.db');
    
    // Get file size
    let totalSize = '—';
    let lastModified = '';
    try {
      const stat = fs.statSync(dbPath);
      totalSize = stat.size < 1024 * 1024
        ? `${(stat.size / 1024).toFixed(1)} KB`
        : `${(stat.size / 1024 / 1024).toFixed(1)} MB`;
      lastModified = stat.mtime.toISOString();
    } catch {}

    // Count records per table
    const tables: Record<string, number> = {};
    const tableNames = [
      'organizations', 'users', 'accounts', 'customers', 'vendors', 'products',
      'invoices', 'expenses', 'bills', 'employees', 'payroll_runs', 'bank_accounts',
      'bank_transactions', 'journal_entries', 'general_ledger', 'projects', 'budgets',
      'fixed_assets', 'crm_contacts', 'crm_deals', 'pos_sales', 'payments',
      'contracts', 'estimates', 'credit_notes', 'purchase_orders', 'work_orders',
      'recurring_invoices', 'recurring_expenses',
    ];
    
    for (const table of tableNames) {
      try {
        const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE del_flag = 0`);
        stmt.step();
        tables[table] = (stmt.getAsObject() as any).count || 0;
        stmt.free();
      } catch {
        // Table might not exist
      }
    }

    res.json({ totalSize, tables, path: dbPath, lastModified });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.get('/export-data', (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.organizationId!;
    const tables = [
      'accounts', 'customers', 'vendors', 'products', 'invoices', 'expenses',
      'bills', 'employees', 'payroll_runs', 'bank_accounts', 'bank_transactions',
      'journal_entries', 'general_ledger', 'projects', 'budgets', 'fixed_assets',
      'crm_contacts', 'crm_deals', 'pos_sales', 'payments', 'contracts',
      'estimates', 'credit_notes', 'purchase_orders', 'work_orders',
    ];

    const exportData: Record<string, any[]> = {};
    for (const table of tables) {
      try {
        const repo = new Repository<any>(table);
        exportData[table] = repo.find({ where: { organizationId: orgId, del_flag: 0 } });
      } catch {}
    }

    // Also export organization settings
    const org = orgRepo.findById(orgId);
    exportData._organization = org ? [org] : [];
    exportData._exportedAt = [{ timestamp: new Date().toISOString(), version: app.getVersion() }];

    res.json(exportData);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.post('/clear-transactions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDB();
    const orgId = req.organizationId!;

    // Tables that hold transaction data (not master data)
    const transactionTables = [
      'invoices', 'expenses', 'bills', 'journal_entries', 'general_ledger',
      'payments', 'payroll_runs', 'pos_sales', 'bank_transactions',
      'recurring_invoices', 'recurring_expenses', 'recurring_journals',
      'estimates', 'credit_notes', 'purchase_orders', 'work_orders',
      'goods_received', 'requisitions', 'time_entries', 'leave_requests',
      'project_tasks', '_sync_log',
    ];

    for (const table of transactionTables) {
      try {
        db.run(`DELETE FROM ${table} WHERE organizationId = ?`, [orgId]);
      } catch {}
    }

    // Reset account balances
    db.run(`UPDATE accounts SET currentBalance = 0, debitBalance = 0, creditBalance = 0 WHERE organizationId = ?`, [orgId]);

    saveToDisk();
    res.json({ success: true, message: 'All transaction data cleared' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

settingsRouter.post('/factory-reset', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDB();

    // Delete ALL data from all tables
    const allTables = [
      'organizations', 'users', 'accounts', 'customers', 'vendors', 'products',
      'invoices', 'expenses', 'bills', 'employees', 'payroll_runs', 'bank_accounts',
      'bank_transactions', 'journal_entries', 'general_ledger', 'projects', 'budgets',
      'fixed_assets', 'crm_contacts', 'crm_deals', 'pos_sales', 'payments',
      'contracts', 'estimates', 'credit_notes', 'purchase_orders', 'work_orders',
      'bill_of_materials', 'work_centers', 'goods_received', 'requisitions',
      'recurring_invoices', 'recurring_expenses', 'recurring_journals',
      'deductions', 'leave_requests', 'time_entries', 'bank_rules',
      'roles', 'project_tasks', '_sync_log', '_sync_state',
    ];

    for (const table of allTables) {
      try { db.run(`DELETE FROM ${table}`); } catch {}
    }

    saveToDisk();

    // Clear auth token
    res.json({ success: true, message: 'Factory reset complete' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Print Preview ──────────────────────────────────────────────────────────

let tempPrintHtml = '';

settingsRouter.post('/temp-print', (req: AuthenticatedRequest, res: Response) => {
  tempPrintHtml = req.body.html || '';
  res.json({ success: true });
});
