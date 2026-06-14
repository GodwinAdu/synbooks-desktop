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
