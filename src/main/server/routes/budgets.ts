import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const budgetsRouter = Router();
const repo = new Repository<any>('budgets');

budgetsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50' } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  res.json(repo.findPaginated({ where, orderBy: 'fiscalYear', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

budgetsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Budget not found' }); return; }
  res.json(item);
});

budgetsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = repo.create({ ...req.body, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

budgetsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Budget not found' }); return; }
  res.json({ success: true, data: repo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

budgetsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Budget not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Budget deleted' });
});
