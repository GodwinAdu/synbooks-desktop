import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const projectsRouter = Router();
const repo = new Repository<any>('projects');

projectsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '20', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  const result = repo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) });
  // Map columns for frontend
  result.data = result.data.map((p: any) => ({
    ...p,
    actualCost: p.spent ?? p.actualCost ?? 0,
    completionPercentage: p.progress ?? p.completionPercentage ?? 0,
    revenue: p.revenue ?? 0,
  }));
  res.json(result);
});

projectsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }
  res.json(item);
});

projectsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { actualCost, completionPercentage, ...rest } = req.body;
    const count = repo.count({ organizationId: req.organizationId });
    const projectNumber = rest.projectNumber || `PRJ-${String(count + 1).padStart(4, '0')}`;
    const item = repo.create({
      ...rest,
      projectNumber,
      spent: actualCost ?? rest.spent ?? 0,
      progress: completionPercentage ?? rest.progress ?? 0,
      organizationId: req.organizationId,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

projectsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }
  res.json({ success: true, data: repo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

projectsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Project deleted' });
});
