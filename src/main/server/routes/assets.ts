import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const assetsRouter = Router();
const repo = new Repository<any>('fixed_assets');

assetsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '20', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  const result = repo.findPaginated({ where, orderBy: 'purchaseDate', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) });
  // Map categoryId to category for frontend
  result.data = result.data.map((a: any) => ({
    ...a,
    category: a.categoryId || a.category || 'Other',
    usefulLifeYears: a.usefulLife ?? a.usefulLifeYears ?? 5,
  }));
  res.json(result);
});

assetsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Asset not found' }); return; }
  res.json(item);
});

assetsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, usefulLifeYears, ...rest } = req.body;
    const count = repo.count({ organizationId: req.organizationId });
    const assetNumber = req.body.assetNumber || `FA-${String(count + 1).padStart(4, '0')}`;
    const item = repo.create({
      ...rest,
      assetNumber,
      categoryId: category || rest.categoryId || 'Other',
      usefulLife: usefulLifeYears ?? rest.usefulLife ?? 5,
      organizationId: req.organizationId,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

assetsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Asset not found' }); return; }
  res.json({ success: true, data: repo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

assetsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Asset not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Asset deleted' });
});

// ─── Dispose asset (with GL posting) ────────────────────────────────────────
assetsRouter.post('/:id/dispose', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = repo.findById(req.params.id);
    if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Asset not found' }); return; }

    const { saleAmount = 0 } = req.body;
    const nbv = (existing.purchaseCost || 0) - (existing.accumulatedDepreciation || 0);
    const gainLoss = saleAmount - nbv;

    // Update status
    repo.update(req.params.id, { status: 'disposed', disposalDate: new Date().toISOString().split('T')[0], disposalAmount: saleAmount, modifiedBy: req.userId });

    // Post GL entries: Debit Acc Dep + Cash, Credit Asset + Gain/Loss
    const { getOrCreateAccount } = require('../services/gl-posting');
    const { getDB, saveToDisk } = require('../../database');
    const { v4: uuid } = require('uuid');
    const db = getDB();
    const now = new Date().toISOString();
    const orgId = req.organizationId!;

    const assetAccountId = getOrCreateAccount(orgId, 'asset', 'Fixed Assets', req.userId || 'system');
    const accDepAccountId = getOrCreateAccount(orgId, 'asset', 'Accumulated Depreciation', req.userId || 'system');
    const cashAccountId = getOrCreateAccount(orgId, 'asset', 'Cash', req.userId || 'system');

    const glLines: any[] = [];
    // Remove accumulated depreciation (debit acc dep)
    if (existing.accumulatedDepreciation > 0) {
      glLines.push({ accountId: accDepAccountId, description: `Dispose: ${existing.name}`, debit: existing.accumulatedDepreciation, credit: 0 });
    }
    // Cash received
    if (saleAmount > 0) {
      glLines.push({ accountId: cashAccountId, description: `Disposal proceeds: ${existing.name}`, debit: saleAmount, credit: 0 });
    }
    // Remove asset cost (credit fixed assets)
    glLines.push({ accountId: assetAccountId, description: `Dispose: ${existing.name}`, debit: 0, credit: existing.purchaseCost });
    // Gain or loss
    if (gainLoss !== 0) {
      const glAccountId = gainLoss > 0
        ? getOrCreateAccount(orgId, 'revenue', 'Gain on Disposal', req.userId || 'system')
        : getOrCreateAccount(orgId, 'expense', 'Loss on Disposal', req.userId || 'system');
      glLines.push({ accountId: glAccountId, description: `${gainLoss > 0 ? 'Gain' : 'Loss'} on disposal: ${existing.name}`, debit: gainLoss < 0 ? Math.abs(gainLoss) : 0, credit: gainLoss > 0 ? gainLoss : 0 });
    }

    // Create journal entry
    const totalDebit = glLines.reduce((s: number, l: any) => s + l.debit, 0);
    const entryId = uuid();
    db.run(
      `INSERT INTO journal_entries (id, organizationId, entryNumber, entryDate, description, lineItems, totalDebit, totalCredit, status, referenceType, referenceId, createdBy, del_flag, createdAt, updatedAt, _dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'asset_disposal', ?, ?, 0, ?, ?, 1)`,
      [entryId, orgId, `JE-DISP-${existing.assetNumber || existing.id.slice(0, 8)}`, now, `Asset disposal: ${existing.name}`, JSON.stringify(glLines), totalDebit, totalDebit, existing.id, req.userId || 'system', now, now]
    );

    // Write GL entries
    const fiscalYear = new Date().getFullYear();
    const fiscalPeriod = new Date().getMonth() + 1;
    for (const line of glLines) {
      db.run(
        `INSERT INTO general_ledger (id, organizationId, accountId, journalEntryId, transactionDate, description, debit, credit, runningBalance, referenceType, referenceId, fiscalYear, fiscalPeriod, del_flag, createdAt, updatedAt, _dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'asset_disposal', ?, ?, ?, 0, ?, ?, 1)`,
        [uuid(), orgId, line.accountId, entryId, now, line.description, line.debit, line.credit, existing.id, fiscalYear, fiscalPeriod, now, now]
      );
    }
    saveToDisk();

    res.json({ success: true, gainLoss, message: `Asset disposed. ${gainLoss >= 0 ? 'Gain' : 'Loss'}: GHS ${Math.abs(gainLoss).toFixed(2)}` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Run monthly depreciation (for all active assets) ────────────────────────
assetsRouter.post('/run-depreciation', (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.organizationId!;
    const activeAssets = repo.find({ where: { organizationId: orgId, del_flag: 0, status: 'active' } });
    if (activeAssets.length === 0) { res.json({ success: true, message: 'No active assets to depreciate', count: 0 }); return; }

    const { getOrCreateAccount } = require('../services/gl-posting');
    const { getDB, saveToDisk } = require('../../database');
    const { v4: uuid } = require('uuid');
    const db = getDB();
    const now = new Date().toISOString();
    const depExpenseAccountId = getOrCreateAccount(orgId, 'expense', 'Depreciation Expense', req.userId || 'system');
    const accDepAccountId = getOrCreateAccount(orgId, 'asset', 'Accumulated Depreciation', req.userId || 'system');

    let totalDep = 0;
    let depCount = 0;

    for (const asset of activeAssets) {
      const cost = asset.purchaseCost || 0;
      const salvage = asset.salvageValue || 0;
      const life = asset.usefulLife || asset.usefulLifeYears || 5;
      const accDep = asset.accumulatedDepreciation || 0;
      const depreciable = cost - salvage;
      if (depreciable <= 0 || accDep >= depreciable) continue;

      let monthlyDep = 0;
      const method = asset.depreciationMethod || 'straight_line';
      if (method === 'straight_line') {
        monthlyDep = depreciable / (life * 12);
      } else if (method === 'reducing_balance') {
        const rate = 2 / life; // Double declining
        const currentBV = cost - accDep;
        monthlyDep = (currentBV * rate) / 12;
      } else {
        monthlyDep = depreciable / (life * 12);
      }

      // Cap at remaining depreciable amount
      monthlyDep = Math.min(monthlyDep, depreciable - accDep);
      if (monthlyDep <= 0) continue;

      // Update asset
      repo.update(asset.id, { accumulatedDepreciation: accDep + monthlyDep, currentValue: cost - accDep - monthlyDep });
      totalDep += monthlyDep;
      depCount++;
    }

    // Post one journal entry for all depreciation this month
    if (totalDep > 0) {
      const entryId = uuid();
      const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const glLines = [
        { accountId: depExpenseAccountId, description: `Monthly depreciation ${period}`, debit: totalDep, credit: 0 },
        { accountId: accDepAccountId, description: `Monthly depreciation ${period}`, debit: 0, credit: totalDep },
      ];

      db.run(
        `INSERT INTO journal_entries (id, organizationId, entryNumber, entryDate, description, lineItems, totalDebit, totalCredit, status, referenceType, createdBy, del_flag, createdAt, updatedAt, _dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'depreciation', ?, 0, ?, ?, 1)`,
        [entryId, orgId, `JE-DEP-${period}`, now, `Monthly depreciation for ${period} (${depCount} assets)`, JSON.stringify(glLines), totalDep, totalDep, req.userId || 'system', now, now]
      );

      const fiscalYear = new Date().getFullYear();
      const fiscalPeriod = new Date().getMonth() + 1;
      for (const line of glLines) {
        db.run(
          `INSERT INTO general_ledger (id, organizationId, accountId, journalEntryId, transactionDate, description, debit, credit, runningBalance, referenceType, fiscalYear, fiscalPeriod, del_flag, createdAt, updatedAt, _dirty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'depreciation', ?, ?, 0, ?, ?, 1)`,
          [uuid(), orgId, line.accountId, entryId, now, line.description, line.debit, line.credit, fiscalYear, fiscalPeriod, now, now]
        );
      }
      saveToDisk();
    }

    res.json({ success: true, message: `Depreciation calculated for ${depCount} assets. Total: GHS ${totalDep.toFixed(2)}`, count: depCount, totalDepreciation: totalDep });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
