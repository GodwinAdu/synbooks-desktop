/**
 * Estimates API Routes
 * CRUD + convert to invoice
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const estimatesRouter = Router();
const repo = new Repository<any>('estimates');
const customerRepo = new Repository<any>('customers');
const invoiceRepo = new Repository<any>('invoices');

estimatesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;

  const result = repo.findPaginated({
    where, orderBy: 'createdAt', order: 'DESC',
    page: parseInt(page as string), pageSize: parseInt(pageSize as string),
  });

  // Enrich with customer name
  result.data = result.data.map((est: any) => {
    const customer = est.customerId ? customerRepo.findById(est.customerId) : null;
    return { ...est, customerName: customer?.name || '' };
  });

  res.json(result);
});

estimatesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }
  const customer = item.customerId ? customerRepo.findById(item.customerId) : null;
  res.json({ ...item, customer });
});

estimatesRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const count = repo.count({ organizationId: req.organizationId });
    const estimateNumber = data.estimateNumber || `EST-${String(count + 1).padStart(5, '0')}`;

    const item = repo.create({
      ...data,
      organizationId: req.organizationId,
      estimateNumber,
      status: data.status || 'draft',
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

estimatesRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }
  const updated = repo.update(req.params.id, { ...req.body, modifiedBy: req.userId });
  res.json({ success: true, data: updated });
});

estimatesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Estimate deleted' });
});

/**
 * POST /api/estimates/:id/convert
 * Convert estimate to a draft invoice
 */
estimatesRouter.post('/:id/convert', (req: AuthenticatedRequest, res: Response) => {
  try {
    const estimate = repo.findById(req.params.id);
    if (!estimate || estimate.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Estimate not found' });
      return;
    }
    if (estimate.status === 'converted') {
      res.status(400).json({ error: 'This estimate has already been converted' });
      return;
    }

    const { dueDate } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Generate invoice number
    const invoiceCount = invoiceRepo.count({ organizationId: req.organizationId });
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, '0')}`;

    // Create draft invoice from estimate
    const invoice = invoiceRepo.create({
      organizationId: req.organizationId,
      invoiceNumber,
      customerId: estimate.customerId,
      invoiceDate: today,
      dueDate: dueDate || today,
      lineItems: estimate.lineItems || [],
      subtotal: estimate.subtotal || 0,
      taxAmount: estimate.taxAmount || 0,
      totalAmount: estimate.totalAmount || 0,
      paidAmount: 0,
      status: 'draft',
      notes: estimate.notes || '',
      terms: estimate.terms || '',
      createdBy: req.userId,
    });

    // Mark estimate as converted
    repo.update(req.params.id, { status: 'converted', modifiedBy: req.userId });

    res.json({ success: true, data: invoice, message: 'Estimate converted to invoice' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/estimates/:id/send
 * Mark estimate as sent
 */
estimatesRouter.post('/:id/send', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }
  repo.update(req.params.id, { status: 'sent', modifiedBy: req.userId });
  res.json({ success: true, message: 'Estimate marked as sent' });
});

/**
 * POST /api/estimates/:id/accept
 */
estimatesRouter.post('/:id/accept', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }
  repo.update(req.params.id, { status: 'accepted', modifiedBy: req.userId });
  res.json({ success: true, message: 'Estimate accepted' });
});

/**
 * POST /api/estimates/:id/decline
 */
estimatesRouter.post('/:id/decline', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }
  repo.update(req.params.id, { status: 'declined', modifiedBy: req.userId });
  res.json({ success: true, message: 'Estimate declined' });
});
