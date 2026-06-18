/**
 * Categories API Routes
 * CRUD for product_categories and expense_categories.
 * These sync with the cloud for Enterprise users.
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const categoriesRouter = Router();
const productCatRepo = new Repository<any>('product_categories');
const expenseCatRepo = new Repository<any>('expense_categories');

// ─── Product Categories ─────────────────────────────────────────────────────

categoriesRouter.get('/product', (req: AuthenticatedRequest, res: Response) => {
  const cats = productCatRepo.find({
    where: { organizationId: req.organizationId, del_flag: 0 },
    orderBy: 'sortOrder',
    order: 'ASC',
  });
  res.json(cats);
});

categoriesRouter.post('/product', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, parentId } = req.body;
    if (!name) { res.status(400).json({ error: 'Name is required' }); return; }
    
    // Check duplicate
    const existing = productCatRepo.findOne({ organizationId: req.organizationId, name, del_flag: 0 });
    if (existing) { res.status(409).json({ error: 'Category already exists' }); return; }

    const count = productCatRepo.count({ organizationId: req.organizationId });
    const cat = productCatRepo.create({
      organizationId: req.organizationId,
      name,
      description: description || null,
      parentId: parentId || null,
      sortOrder: count,
      isActive: 1,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: cat });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

categoriesRouter.put('/product/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = productCatRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Category not found' }); return;
  }
  const updated = productCatRepo.update(req.params.id, req.body);
  res.json({ success: true, data: updated });
});

categoriesRouter.delete('/product/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = productCatRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Category not found' }); return;
  }
  productCatRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Category deleted' });
});

// ─── Expense Categories ─────────────────────────────────────────────────────

categoriesRouter.get('/expense', (req: AuthenticatedRequest, res: Response) => {
  const cats = expenseCatRepo.find({
    where: { organizationId: req.organizationId, del_flag: 0 },
    orderBy: 'sortOrder',
    order: 'ASC',
  });
  res.json(cats);
});

categoriesRouter.post('/expense', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, parentId } = req.body;
    if (!name) { res.status(400).json({ error: 'Name is required' }); return; }
    
    const existing = expenseCatRepo.findOne({ organizationId: req.organizationId, name, del_flag: 0 });
    if (existing) { res.status(409).json({ error: 'Category already exists' }); return; }

    const count = expenseCatRepo.count({ organizationId: req.organizationId });
    const cat = expenseCatRepo.create({
      organizationId: req.organizationId,
      name,
      description: description || null,
      parentId: parentId || null,
      sortOrder: count,
      isActive: 1,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: cat });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

categoriesRouter.put('/expense/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = expenseCatRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Category not found' }); return;
  }
  const updated = expenseCatRepo.update(req.params.id, req.body);
  res.json({ success: true, data: updated });
});

categoriesRouter.delete('/expense/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = expenseCatRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Category not found' }); return;
  }
  expenseCatRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Category deleted' });
});
