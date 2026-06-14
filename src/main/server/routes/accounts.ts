import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const accountsRouter = Router();
const repo = new Repository<any>('accounts');

accountsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { type, active } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (type) where.accountType = type;
  if (active !== undefined) where.isActive = active === 'true' ? 1 : 0;
  res.json(repo.find({ where, orderBy: 'accountCode', order: 'ASC' }));
});

accountsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Account not found' }); return; }
  res.json(item);
});

accountsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = repo.create({ ...req.body, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

accountsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Account not found' }); return; }
  res.json({ success: true, data: repo.update(req.params.id, req.body) });
});

accountsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Account not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Account deleted' });
});
