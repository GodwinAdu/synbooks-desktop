import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { checkPlanLimit } from '../middleware/plan-limits';
import { dbGet } from '../../database';

export const productsRouter = Router();
const repo = new Repository<any>('products');

productsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', status, categoryId, search, type } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (type) where.type = type;
  if (search) where.name = { $like: search };
  res.json(repo.findPaginated({ where, orderBy: 'name', order: 'ASC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

productsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Product not found' }); return; }
  res.json(item);
});

productsRouter.post('/', checkPlanLimit('products'), (req: AuthenticatedRequest, res: Response) => {
  try {
    // Auto-generate SKU if not provided
    let { sku, ...rest } = req.body;
    if (!sku) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      sku = 'PRD-';
      for (let i = 0; i < 6; i++) sku += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const item = repo.create({ ...rest, sku, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

productsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Product not found' }); return; }
  res.json({ success: true, data: repo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

productsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Product not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Product deleted' });
});

// Stock adjustment (also records in stock_adjustments table)
productsRouter.post('/:id/adjust-stock', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Product not found' }); return; }
  const { adjustment, reason } = req.body;
  const previousStock = existing.currentStock || 0;
  const newStock = Math.max(0, previousStock + adjustment);
  repo.update(req.params.id, { currentStock: newStock, modifiedBy: req.userId });

  // Record in stock_adjustments table
  try {
    const adjRepo = new Repository<any>('stock_adjustments');
    const user = dbGet(`SELECT firstName, lastName FROM users WHERE id = ?`, [req.userId]);
    const createdByName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown';
    adjRepo.create({
      organizationId: req.organizationId,
      productId: req.params.id,
      productName: existing.name || '',
      productSku: existing.sku || '',
      type: adjustment >= 0 ? 'increase' : 'decrease',
      quantity: Math.abs(adjustment),
      previousStock,
      newStock,
      reason: reason || 'Manual adjustment',
      createdBy: req.userId,
      createdByName,
    });
  } catch (e) { /* non-critical - stock was already adjusted */ }

  res.json({ success: true, newStock });
});
