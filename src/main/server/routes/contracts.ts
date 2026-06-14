import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const contractsRouter = Router();
const repo = new Repository<any>('contracts');

contractsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', status, search } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  if (search) where.title = { $like: search };
  res.json(repo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

contractsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Contract not found' }); return; }
  res.json(item);
});

contractsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = repo.count({ organizationId: req.organizationId });
    const contractNumber = req.body.contractNumber || `CON-${String(count + 1).padStart(4, '0')}`;
    const item = repo.create({ ...req.body, contractNumber, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

contractsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Contract not found' }); return; }
  res.json({ success: true, data: repo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

contractsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Contract not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Contract deleted' });
});
