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

// Bill of Materials
productionRouter.get('/bom', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50' } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  res.json(bomRepo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

productionRouter.post('/bom', (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = bomRepo.count({ organizationId: req.organizationId });
    const bomNumber = req.body.bomNumber || `BOM-${String(count + 1).padStart(4, '0')}`;
    const item = bomRepo.create({ ...req.body, bomNumber, organizationId: req.organizationId, createdBy: req.userId });
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
