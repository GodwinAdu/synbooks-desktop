import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const procurementRouter = Router();
const requisitionRepo = new Repository<any>('requisitions');
const grnRepo = new Repository<any>('goods_received');

// Requisitions
procurementRouter.get('/requisitions', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  res.json(requisitionRepo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

procurementRouter.post('/requisitions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = requisitionRepo.count({ organizationId: req.organizationId });
    const requisitionNumber = req.body.requisitionNumber || `REQ-${String(count + 1).padStart(5, '0')}`;
    const item = requisitionRepo.create({ ...req.body, requisitionNumber, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

procurementRouter.put('/requisitions/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = requisitionRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Requisition not found' }); return; }
  res.json({ success: true, data: requisitionRepo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

procurementRouter.delete('/requisitions/:id', (req: AuthenticatedRequest, res: Response) => {
  requisitionRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Requisition deleted' });
});

// Goods Received Notes
procurementRouter.get('/goods-received', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  res.json(grnRepo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

procurementRouter.post('/goods-received', (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = grnRepo.count({ organizationId: req.organizationId });
    const grnNumber = req.body.grnNumber || `GRN-${String(count + 1).padStart(5, '0')}`;
    const item = grnRepo.create({ ...req.body, grnNumber, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

procurementRouter.put('/goods-received/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = grnRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'GRN not found' }); return; }
  res.json({ success: true, data: grnRepo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

procurementRouter.delete('/goods-received/:id', (req: AuthenticatedRequest, res: Response) => {
  grnRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'GRN deleted' });
});
