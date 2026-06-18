/**
 * Credit Notes API Routes
 * CRUD + status transitions: issue, apply to invoice, void.
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const creditNotesRouter = Router();
const repo = new Repository<any>('credit_notes');
const customerRepo = new Repository<any>('customers');
const invoiceRepo = new Repository<any>('invoices');

// GET / — list with customer enrichment, optional status filter
creditNotesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', status, customerId } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const result = repo.findPaginated({
    where, orderBy: 'creditNoteDate', order: 'DESC',
    page: parseInt(page as string), pageSize: parseInt(pageSize as string),
  });

  result.data = result.data.map((cn: any) => {
    const customer = cn.customerId ? customerRepo.findById(cn.customerId) : null;
    const invoice = cn.invoiceId ? invoiceRepo.findById(cn.invoiceId) : null;
    return {
      ...cn,
      customerName: customer?.name || '',
      invoiceNumber: invoice?.invoiceNumber || '',
    };
  });

  res.json(result);
});

// GET /:id — single with enrichment
creditNotesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Credit note not found' });
    return;
  }
  const customer = item.customerId ? customerRepo.findById(item.customerId) : null;
  const invoice = item.invoiceId ? invoiceRepo.findById(item.invoiceId) : null;
  res.json({ ...item, customerName: customer?.name, invoiceNumber: invoice?.invoiceNumber });
});

// POST / — create (auto-generate creditNoteNumber CN-00001)
creditNotesRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const count = repo.count({ organizationId: req.organizationId });
    const creditNoteNumber = data.creditNoteNumber || `CN-${String(count + 1).padStart(5, '0')}`;

    const creditNote = repo.create({
      ...data,
      organizationId: req.organizationId,
      creditNoteNumber,
      status: data.status || 'draft',
      createdBy: req.userId,
    });

    res.status(201).json({ success: true, data: creditNote });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /:id — update
creditNotesRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Credit note not found' });
    return;
  }
  const updated = repo.update(req.params.id, { ...req.body, modifiedBy: req.userId });
  res.json({ success: true, data: updated });
});

// DELETE /:id — soft delete
creditNotesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Credit note not found' });
    return;
  }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Credit note deleted' });
});

// POST /:id/issue — mark as issued
creditNotesRouter.post('/:id/issue', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Credit note not found' });
    return;
  }
  if (existing.status !== 'draft') {
    res.status(400).json({ error: 'Only draft credit notes can be issued' });
    return;
  }
  const updated = repo.update(req.params.id, { status: 'issued', modifiedBy: req.userId });
  res.json({ success: true, data: updated });
});

// POST /:id/apply — apply credit to invoice (reduce invoice balance)
creditNotesRouter.post('/:id/apply', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Credit note not found' });
    return;
  }
  if (existing.status !== 'issued') {
    res.status(400).json({ error: 'Only issued credit notes can be applied' });
    return;
  }

  const invoiceId = req.body.invoiceId || existing.invoiceId;
  if (!invoiceId) {
    res.status(400).json({ error: 'No invoice specified to apply credit to' });
    return;
  }

  const invoice = invoiceRepo.findById(invoiceId);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  // Reduce invoice balance by credit note amount
  const creditAmount = existing.totalAmount || 0;
  const newPaid = (invoice.paidAmount || 0) + creditAmount;
  const newStatus = newPaid >= invoice.totalAmount ? 'paid' : invoice.status;
  invoiceRepo.update(invoiceId, { paidAmount: newPaid, status: newStatus, modifiedBy: req.userId });

  const updated = repo.update(req.params.id, { status: 'applied', invoiceId, modifiedBy: req.userId });
  res.json({ success: true, data: updated, message: `Applied ${creditAmount} credit to invoice` });
});

// POST /:id/void — void the credit note
creditNotesRouter.post('/:id/void', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Credit note not found' });
    return;
  }
  if (existing.status === 'voided') {
    res.status(400).json({ error: 'Credit note is already voided' });
    return;
  }
  if (existing.status === 'applied') {
    res.status(400).json({ error: 'Cannot void an applied credit note' });
    return;
  }
  const updated = repo.update(req.params.id, { status: 'voided', modifiedBy: req.userId });
  res.json({ success: true, data: updated });
});
