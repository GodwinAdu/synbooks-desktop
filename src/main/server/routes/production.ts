import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const productionRouter = Router();
const workOrderRepo = new Repository<any>('work_orders');
const bomRepo = new Repository<any>('bill_of_materials');
const workCenterRepo = new Repository<any>('work_centers');

// Work Orders
productionRouter.get('/work-orders', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  res.json(workOrderRepo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

productionRouter.post('/work-orders', (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = workOrderRepo.count({ organizationId: req.organizationId });
    const workOrderNumber = req.body.workOrderNumber || `WO-${String(count + 1).padStart(5, '0')}`;
    const item = workOrderRepo.create({ ...req.body, workOrderNumber, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

productionRouter.put('/work-orders/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = workOrderRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Work order not found' }); return; }
  res.json({ success: true, data: workOrderRepo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

productionRouter.delete('/work-orders/:id', (req: AuthenticatedRequest, res: Response) => {
  workOrderRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Work order deleted' });
});

// ─── Work Order Status Actions ───────────────────────────────────────────────

// Start Production — changes status to in_progress, deducts materials from inventory
productionRouter.post('/work-orders/:id/start', (req: AuthenticatedRequest, res: Response) => {
  try {
    const wo = workOrderRepo.findById(req.params.id);
    if (!wo || wo.organizationId !== req.organizationId) { res.status(404).json({ error: 'Work order not found' }); return; }
    if (wo.status !== 'draft' && wo.status !== 'planned') { res.status(400).json({ error: 'Can only start draft or planned work orders' }); return; }

    workOrderRepo.update(req.params.id, { status: 'in_progress', startDate: wo.startDate || new Date().toISOString().split('T')[0], modifiedBy: req.userId });

    // Deduct materials from inventory if BOM is linked
    if (wo.bomId) {
      const bom = bomRepo.findById(wo.bomId);
      if (bom) {
        let materials: any[] = [];
        try { materials = typeof bom.materials === 'string' ? JSON.parse(bom.materials) : (bom.materials || []); } catch {}
        const productRepo = new Repository<any>('products');
        for (const mat of materials) {
          if (mat.productId) {
            const product = productRepo.findById(mat.productId);
            if (product && product.trackInventory) {
              const consumed = (mat.quantity || 0) * (wo.quantity || 1);
              productRepo.update(mat.productId, { currentStock: Math.max(0, (product.currentStock || 0) - consumed) });
            }
          }
        }
      }
    }

    res.json({ success: true, message: 'Production started. Materials consumed from inventory.' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Complete Work Order — posts GL entry (Debit: Finished Goods, Credit: WIP/Manufacturing)
productionRouter.post('/work-orders/:id/complete', (req: AuthenticatedRequest, res: Response) => {
  try {
    const wo = workOrderRepo.findById(req.params.id);
    if (!wo || wo.organizationId !== req.organizationId) { res.status(404).json({ error: 'Work order not found' }); return; }
    if (wo.status !== 'in_progress') { res.status(400).json({ error: 'Can only complete in-progress work orders' }); return; }

    const { completedQuantity, rejectedQuantity, actualCost } = req.body;
    const completed = completedQuantity ?? wo.quantity;
    const rejected = rejectedQuantity ?? 0;
    const cost = actualCost ?? wo.estimatedCost ?? 0;

    workOrderRepo.update(req.params.id, {
      status: 'completed',
      completedQuantity: completed,
      rejectedQuantity: rejected,
      actualCost: cost,
      completedDate: new Date().toISOString().split('T')[0],
      modifiedBy: req.userId,
    });

    // Add completed goods to inventory
    if (wo.productId) {
      const productRepo = new Repository<any>('products');
      const product = productRepo.findById(wo.productId);
      if (product && product.trackInventory) {
        productRepo.update(wo.productId, { currentStock: (product.currentStock || 0) + completed });
      }
    }

    // Post GL entry: Debit Finished Goods Inventory, Credit Manufacturing/WIP
    if (cost > 0) {
      const { getOrCreateAccount } = require('../services/gl-posting');
      const { getDB, saveToDisk } = require('../../database');
      const { v4: uuid } = require('uuid');
      const db = getDB();
      const now = new Date().toISOString();
      const orgId = req.organizationId!;

      const inventoryAccountId = getOrCreateAccount(orgId, 'asset', 'Finished Goods Inventory', req.userId || 'system');
      const wipAccountId = getOrCreateAccount(orgId, 'expense', 'Manufacturing Costs', req.userId || 'system');

      const glLines = [
        { accountId: inventoryAccountId, description: `Production: ${wo.workOrderNumber} (${completed} units)`, debit: cost, credit: 0 },
        { accountId: wipAccountId, description: `Production: ${wo.workOrderNumber}`, debit: 0, credit: cost },
      ];

      const entryId = uuid();
      db.run(
        `INSERT INTO journal_entries (id, organizationId, entryNumber, entryDate, description, lineItems, totalDebit, totalCredit, status, referenceType, referenceId, referenceNumber, createdBy, del_flag, createdAt, updatedAt, _dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'production', ?, ?, ?, 0, ?, ?, 1)`,
        [entryId, orgId, `JE-PROD-${wo.workOrderNumber}`, now, `Production completed: ${wo.workOrderNumber}`, JSON.stringify(glLines), cost, cost, wo.id, wo.workOrderNumber, req.userId || 'system', now, now]
      );

      const fiscalYear = new Date().getFullYear();
      const fiscalPeriod = new Date().getMonth() + 1;
      for (const line of glLines) {
        db.run(
          `INSERT INTO general_ledger (id, organizationId, accountId, journalEntryId, transactionDate, description, debit, credit, runningBalance, referenceType, referenceId, referenceNumber, fiscalYear, fiscalPeriod, del_flag, createdAt, updatedAt, _dirty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'production', ?, ?, ?, ?, 0, ?, ?, 1)`,
          [uuid(), orgId, line.accountId, entryId, now, line.description, line.debit, line.credit, wo.id, wo.workOrderNumber, fiscalYear, fiscalPeriod, now, now]
        );
      }
      saveToDisk();
    }

    res.json({ success: true, message: `Work order completed. ${completed} units produced.` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Cancel Work Order — reverses material consumption if applicable
productionRouter.post('/work-orders/:id/cancel', (req: AuthenticatedRequest, res: Response) => {
  try {
    const wo = workOrderRepo.findById(req.params.id);
    if (!wo || wo.organizationId !== req.organizationId) { res.status(404).json({ error: 'Work order not found' }); return; }
    if (wo.status === 'completed' || wo.status === 'cancelled') { res.status(400).json({ error: 'Cannot cancel a completed or already cancelled work order' }); return; }

    workOrderRepo.update(req.params.id, { status: 'cancelled', modifiedBy: req.userId });

    // Return materials to inventory if production had started
    if (wo.status === 'in_progress' && wo.bomId) {
      const bom = bomRepo.findById(wo.bomId);
      if (bom) {
        let materials: any[] = [];
        try { materials = typeof bom.materials === 'string' ? JSON.parse(bom.materials) : (bom.materials || []); } catch {}
        const productRepo = new Repository<any>('products');
        for (const mat of materials) {
          if (mat.productId) {
            const product = productRepo.findById(mat.productId);
            if (product && product.trackInventory) {
              const consumed = (mat.quantity || 0) * (wo.quantity || 1);
              productRepo.update(mat.productId, { currentStock: (product.currentStock || 0) + consumed });
            }
          }
        }
      }
    }

    res.json({ success: true, message: 'Work order cancelled. Materials returned to inventory.' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Bill of Materials
productionRouter.get('/bom', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50' } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  res.json(bomRepo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});
// Alias: /boms also accepted
productionRouter.get('/boms', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50' } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  const result = bomRepo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) });
  // Deserialize materials JSON
  result.data = result.data.map((b: any) => {
    let materials = b.materials;
    if (typeof materials === 'string') { try { materials = JSON.parse(materials); } catch { materials = []; } }
    return { ...b, materials: materials || [] };
  });
  res.json(result);
});

productionRouter.post('/bom', (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = bomRepo.count({ organizationId: req.organizationId });
    const bomNumber = req.body.bomNumber || `BOM-${String(count + 1).padStart(4, '0')}`;
    const { materials, ...rest } = req.body;
    const costPerUnit = Array.isArray(materials) ? materials.reduce((s: number, m: any) => s + ((m.quantity || 0) * (m.costPerUnit || 0)), 0) / (rest.outputQuantity || 1) : 0;
    const item = bomRepo.create({ ...rest, bomNumber, materials: JSON.stringify(materials || []), costPerUnit, isActive: true, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
productionRouter.post('/boms', (req: AuthenticatedRequest, res: Response) => {
  // Alias for /bom POST
  try {
    const count = bomRepo.count({ organizationId: req.organizationId });
    const bomNumber = req.body.bomNumber || `BOM-${String(count + 1).padStart(4, '0')}`;
    const { materials, ...rest } = req.body;
    const costPerUnit = Array.isArray(materials) ? materials.reduce((s: number, m: any) => s + ((m.quantity || 0) * (m.costPerUnit || 0)), 0) / (rest.outputQuantity || 1) : 0;
    const item = bomRepo.create({ ...rest, bomNumber, materials: JSON.stringify(materials || []), costPerUnit, isActive: true, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

productionRouter.put('/bom/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = bomRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'BOM not found' }); return; }
  res.json({ success: true, data: bomRepo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

productionRouter.delete('/bom/:id', (req: AuthenticatedRequest, res: Response) => {
  bomRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'BOM deleted' });
});

// Work Centers
productionRouter.get('/work-centers', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50' } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  res.json(workCenterRepo.findPaginated({ where, orderBy: 'name', order: 'ASC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

productionRouter.post('/work-centers', (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = workCenterRepo.create({ ...req.body, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

productionRouter.put('/work-centers/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = workCenterRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Work center not found' }); return; }
  res.json({ success: true, data: workCenterRepo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

productionRouter.delete('/work-centers/:id', (req: AuthenticatedRequest, res: Response) => {
  workCenterRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Work center deleted' });
});
