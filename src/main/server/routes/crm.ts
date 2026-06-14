import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const crmRouter = Router();
const contactRepo = new Repository<any>('crm_contacts');
const dealRepo = new Repository<any>('crm_deals');

// Contacts
crmRouter.get('/contacts', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', type, status, search } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) where.name = { $like: search };
  res.json(contactRepo.findPaginated({ where, orderBy: 'name', order: 'ASC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

crmRouter.get('/contacts/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = contactRepo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Contact not found' }); return; }
  res.json(item);
});

crmRouter.post('/contacts', (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = contactRepo.create({ ...req.body, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

crmRouter.put('/contacts/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = contactRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Contact not found' }); return; }
  res.json({ success: true, data: contactRepo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

crmRouter.delete('/contacts/:id', (req: AuthenticatedRequest, res: Response) => {
  contactRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Contact deleted' });
});

// Deals
crmRouter.get('/deals', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '20', stage } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (stage) where.stage = stage;
  const result = dealRepo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) });
  // Map value -> amount and lookup contactName
  result.data = result.data.map((d: any) => {
    const contact = d.contactId ? contactRepo.findById(d.contactId) : null;
    return { ...d, amount: d.value ?? d.amount ?? 0, contactName: contact?.name || d.contactName || '' };
  });
  res.json(result);
});

crmRouter.get('/deals/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = dealRepo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Deal not found' }); return; }
  res.json(item);
});

crmRouter.post('/deals', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, ...rest } = req.body;
    const item = dealRepo.create({ ...rest, value: amount ?? rest.value ?? 0, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

crmRouter.put('/deals/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = dealRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Deal not found' }); return; }
  res.json({ success: true, data: dealRepo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

crmRouter.delete('/deals/:id', (req: AuthenticatedRequest, res: Response) => {
  dealRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Deal deleted' });
});
