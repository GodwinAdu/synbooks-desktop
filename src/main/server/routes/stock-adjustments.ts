/**
 * Stock Adjustments API Routes
 * CRUD for stock adjustment records.
 * Adjustments modify product stock and record the history.
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { dbGet } from '../../database';

export const stockAdjustmentsRouter = Router();
const repo = new Repository<any>('stock_adjustments');
const productRepo = new Repository<any>('products');

// ─── List all adjustments ────────────────────────────────────────────────────

stockAdjustmentsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const adjustments = repo.find({
    where: { organizationId: req.organizationId, del_flag: 0 },
    orderBy: 'createdAt',
    order: 'DESC',
  });
  res.json(adjustments);
});

// ─── Get single adjustment ───────────────────────────────────────────────────

stockAdjustmentsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const adj = repo.findById(req.params.id);
  if (!adj || adj.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Adjustment not found' });
    return;
  }
  res.json(adj);
});

// ─── Create new adjustment ───────────────────────────────────────────────────

stockAdjustmentsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, type, quantity, reason, notes } = req.body;

    if (!productId) { res.status(400).json({ error: 'Product is required' }); return; }
    if (!type || !['increase', 'decrease'].includes(type)) {
      res.status(400).json({ error: 'Type must be "increase" or "decrease"' }); return;
    }
    if (!quantity || quantity <= 0) {
      res.status(400).json({ error: 'Quantity must be a positive number' }); return;
    }
    if (!reason) { res.status(400).json({ error: 'Reason is required' }); return; }

    // Get product
    const product = productRepo.findById(productId);
    if (!product || product.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Product not found' }); return;
    }

    const previousStock = product.currentStock || 0;
    const adjustmentAmount = type === 'increase' ? quantity : -quantity;
    const newStock = Math.max(0, previousStock + adjustmentAmount);

    // Update product stock
    productRepo.update(productId, { currentStock: newStock, modifiedBy: req.userId });

    // Get user name
    const user = dbGet(`SELECT firstName, lastName FROM users WHERE id = ?`, [req.userId]);
    const createdByName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown';

    // Record adjustment
    const adjustment = repo.create({
      organizationId: req.organizationId,
      productId,
      productName: product.name || '',
      productSku: product.sku || '',
      type,
      quantity,
      previousStock,
      newStock,
      reason,
      notes: notes || null,
      createdBy: req.userId,
      createdByName,
    });

    res.status(201).json({ success: true, data: adjustment, newStock });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Delete adjustment (soft) ────────────────────────────────────────────────

stockAdjustmentsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const adj = repo.findById(req.params.id);
  if (!adj || adj.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Adjustment not found' }); return;
  }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Adjustment deleted' });
});

// ─── Summary stats ───────────────────────────────────────────────────────────

stockAdjustmentsRouter.get('/stats/summary', (req: AuthenticatedRequest, res: Response) => {
  const all = repo.find({
    where: { organizationId: req.organizationId, del_flag: 0 },
  });

  const totalAdjustments = all.length;
  const increases = all.filter((a: any) => a.type === 'increase');
  const decreases = all.filter((a: any) => a.type === 'decrease');
  const totalIncreased = increases.reduce((sum: number, a: any) => sum + (a.quantity || 0), 0);
  const totalDecreased = decreases.reduce((sum: number, a: any) => sum + (a.quantity || 0), 0);

  res.json({
    totalAdjustments,
    totalIncreases: increases.length,
    totalDecreases: decreases.length,
    totalIncreased,
    totalDecreased,
    netChange: totalIncreased - totalDecreased,
  });
});
