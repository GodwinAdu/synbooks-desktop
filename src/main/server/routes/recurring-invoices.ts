/**
 * Recurring Invoices API Routes
 * CRUD for recurring invoice templates.
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const recurringInvoicesRouter = Router();
const repo = new Repository<any>('recurring_invoices');
const customerRepo = new Repository<any>('customers');

recurringInvoicesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50' } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };

  const result = repo.findPaginated({
    where, orderBy: 'createdAt', order: 'DESC',
    page: parseInt(page as string), pageSize: parseInt(pageSize as string),
  });

  // Enrich with customer name and compute fields
  result.data = result.data.map((t: any) => {
    const customer = t.customerId ? customerRepo.findById(t.customerId) : null;
    return {
      ...t,
      templateName: t.profileName || t.templateName || 'Untitled',
      customerName: customer?.name || t.customerName || '',
      nextInvoiceDate: t.nextRunDate || t.startDate,
      invoicesGenerated: t.lastGeneratedAt ? 1 : 0,
    };
  });

  res.json(result);
});

recurringInvoicesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  res.json(item);
});

recurringInvoicesRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = repo.create({
      ...req.body,
      organizationId: req.organizationId,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

recurringInvoicesRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  const updated = repo.update(req.params.id, { ...req.body, modifiedBy: req.userId });
  res.json({ success: true, data: updated });
});

recurringInvoicesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Template deleted' });
});

/**
 * POST /api/recurring-invoices/:id/generate
 * Manually generate a draft invoice from this template right now
 */
recurringInvoicesRouter.post('/:id/generate', (req: AuthenticatedRequest, res: Response) => {
  try {
    const template = repo.findById(req.params.id);
    if (!template || template.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const invoiceRepo = new Repository<any>('invoices');
    const today = new Date().toISOString().split('T')[0];

    // Parse line items
    let lineItems = [];
    try {
      if (Array.isArray(template.lineItems)) {
        lineItems = template.lineItems;
      } else if (typeof template.lineItems === 'string') {
        lineItems = JSON.parse(template.lineItems);
      }
    } catch {}
    if (!Array.isArray(lineItems)) lineItems = [];

    // Generate invoice number
    const count = invoiceRepo.count({ organizationId: req.organizationId });
    const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

    // Due date: 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create draft invoice
    const invoice = invoiceRepo.create({
      organizationId: req.organizationId,
      invoiceNumber,
      customerId: template.customerId || null,
      invoiceDate: today,
      dueDate: dueDate.toISOString().split('T')[0],
      lineItems,
      subtotal: template.subtotal || template.totalAmount || 0,
      taxAmount: template.taxAmount || 0,
      totalAmount: template.totalAmount || 0,
      paidAmount: 0,
      status: 'draft',
      notes: `Auto-generated from recurring template: ${template.profileName || ''}`,
      createdBy: req.userId,
    });

    // Update template's lastGeneratedAt
    repo.update(template.id, {
      lastGeneratedAt: new Date().toISOString(),
      modifiedBy: req.userId,
    });

    res.json({ success: true, data: invoice, message: 'Draft invoice generated' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
